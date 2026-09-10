import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import FeedNews from '@/components/FeedNews'
import { attachPostMeta } from '@/lib/postMeta'
import NewsList from '@/components/NewsList'
import { fetchNewsMixed } from '@/lib/news'
import { toneFor, labelFor, type Direction } from '@/lib/odds'
import { tickerOf, tickerHref } from '@/lib/ticker'
import { fetchRailGames } from '@/lib/scores'
import { cleanPreferences, railLeaguesFor, newsLeaguesFor } from '@/lib/preferences'
import Scoreboard from '@/components/Scoreboard'
import JoinCard from '@/components/JoinCard'
import WelcomeModal from '@/components/WelcomeModal'
import WhatThisIs from '@/components/WhatThisIs'
import { FOUNDING_LIMIT } from '@/lib/badges'
import NewsRail from '@/components/NewsRail'
import FeedTabs from '@/components/FeedTabs'
import { SITE_NAME } from '@/lib/brand'
import Link from 'next/link'
import { arrangeFeed } from '@/lib/feed'
import ClipRail from '@/components/ClipRail'
import { fetchClips } from '@/lib/clips'

/** How many posts the feed shows. */
const FEED_SIZE = 50
/** How many it reads to build them from — see the note on the query. */
const FEED_WINDOW = 150

export const dynamic = 'force-dynamic'

const NEWS_EVERY = 5

export default async function FeedPage(props: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const search = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Who this person follows. Read whatever the view, because the toggle
  // only makes sense to offer once they follow somebody — showing
  // "Following" to an account that follows nobody is an empty tab and a
  // dead end.
  const { data: followRows } = user
    ? await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    : { data: null }
  const followingIds: string[] = (followRows ?? []).map((f: any) => f.following_id)
  const canFilter = followingIds.length > 0
  const onlyFollowing = canFilter && search.view === 'following'

  // What this person follows, if they said. A logged-out visitor has no
  // preferences to read and gets the default mix, which is the point of
  // the rail existing at all.
  const { data: prefRow } = user
    ? await supabase.from('profiles').select('preferred_leagues').eq('id', user.id).maybeSingle()
    : { data: null }
  const preferred = cleanPreferences(prefRow?.preferred_leagues)

  // The live founding count, for the welcome card. Read here rather than
  // fetched by the modal so the number is in the first paint.
  let foundingLeft: number | null = null
  if (!user) {
    const { count } = await supabase
      .from('profiles').select('id', { count: 'exact', head: true })
      .contains('badges', ['founding'])
    if (count !== null) foundingLeft = Math.max(0, FOUNDING_LIMIT - count)
  }

  const tabs = <FeedTabs active="home" />
  const viewSwitch = canFilter ? (
    <div className="view-switch">
      <Link href="/feed" className={`view-opt ${onlyFollowing ? '' : 'active'}`}>Everyone</Link>
      <Link href="/feed?view=following" className={`view-opt ${onlyFollowing ? 'active' : ''}`}>Following</Link>
    </div>
  ) : null

  // News needs no account. It's the one thing a cold visitor can actually
  // look at, which is the entire reason it exists — gating it behind
  // signup would show it only to people who are already convinced.
  // Blocking used to write a row and change nothing — the feed never read
  // the table, so a blocked user's picks kept showing up.
  const { data: blocks } = user
    ? await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
    : { data: [] }
  const blockedIds = (blocks ?? []).map((b: any) => b.blocked_id)

  let query = supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, tag2, ticker, ticker2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey!inner ( id, username, avatar_url, is_banned, is_bot ),
      category:categories ( name ),
      likes ( user_id, emoji ),
      comments ( id )
    `)
    // Banning set a flag that only the leaderboard respected; the feed
    // still carried the banned user's posts.
    .eq('author.is_banned', false)
    .order('created_at', { ascending: false })
    // Deliberately wider than the feed itself. The house account posts
    // several times a day and a handful of people post every few days,
    // so the 50 most recent posts contained just two human ones — there
    // was nothing left for arrangeFeed to interleave with. Reading a
    // wider window and trimming afterwards is what puts people back on
    // the page.
    //
    // Same stopgap as lib/feed.ts and it expires the same way: once
    // people post enough to fill 50 slots on their own, this can go back
    // to a plain limit.
    .limit(FEED_WINDOW)

  if (blockedIds.length > 0) {
    query = query.not('author_id', 'in', `(${blockedIds.join(',')})`)
  }

  // The whole point of Following is that it's only the people you chose,
  // so the house model is in it exactly when somebody has chosen to
  // follow the house model.
  if (onlyFollowing) {
    query = query.in('author_id', followingIds)
  }

  const { data: rawPosts } = await query

  // People first, the model at a fixed ratio behind them. Ordering by
  // date alone handed the whole timeline to the house account, which
  // posts every few hours against a handful of people posting every few
  // days — see lib/feed.ts.
  // Only the everyone-feed needs rebalancing. Following is whoever you
  // picked, in the order they posted — reordering someone's own choices
  // would be presumptuous, and the model can't crowd a list it isn't on.
  const posts = onlyFollowing
    ? (rawPosts ?? []).slice(0, FEED_SIZE)
    : arrangeFeed(rawPosts ?? []).slice(0, FEED_SIZE)

  const shaped = (posts ?? []).map((p: any) => ({
    ...p,
    comment_count: p.comments?.length ?? 0,
    viewer_id: user?.id ?? null,
  }))

  // Ticker: most recent picks that have a tag, newest first.
  const tickerItems = shaped.filter((p: any) => p.tag).slice(0, 10)

  // Trending: group by cashtag and count whichever direction each post
  // took. Four directions now (backing/fading for sides, over/under for
  // totals), and a total counts under BOTH teams' tags.
  // Group on the ticker, not the whole tag: "$LAL -4.5" and "$LAL -3.5"
  // are the same team and used to count as two separate trends.
  const tagCounts: Record<string, Record<string, number>> = {}
  // Who is saying it, not just how often it's said. Three posts from one
  // account used to be enough to trend, so anyone could invent a cashtag
  // and push it onto the front page alone. A real movement has more than
  // one voice in it, and that's the only difference worth testing for.
  const tagVoices: Record<string, Set<string>> = {}
  for (const p of shaped) {
    // A total is on the game, so it counts under both teams. A spread or
    // moneyline is on one of them — now that those keep an opponent tag
    // too, counting it under both would say someone was backing the team
    // they bet against.
    const opponent = p.bet_type === 'total' ? (p.ticker2 ?? tickerOf(p.tag2)) : null
    for (const t of [p.ticker ?? tickerOf(p.tag), opponent]) {
      if (!t) continue
      tagCounts[t] = tagCounts[t] ?? {}
      tagCounts[t][p.sentiment] = (tagCounts[t][p.sentiment] ?? 0) + 1
      tagVoices[t] = tagVoices[t] ?? new Set()
      if (p.author?.id) tagVoices[t].add(p.author.id)
    }
  }
  // A tag needs a few picks behind it before a percentage means anything.
  // One pick rendering as "100% Backing" reads like a statistic when it's
  // one person's post, which makes the panel look thinner than saying
  // nothing would. Below the threshold the whole card hides itself.
  const MIN_TRENDING_PICKS = 3
  // Three different people. Two is a conversation; three is the smallest
  // number that reads as a group rather than someone and a friend.
  const MIN_TRENDING_VOICES = 3

  const trending = Object.entries(tagCounts)
    .map(([tag, counts]) => {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
      const total = entries.reduce((sum, [, n]) => sum + n, 0)
      const [leader, leadCount] = entries[0]
      return { tag, total, leader, pct: Math.round((100 * leadCount) / total) }
    })
    .filter(t => t.total >= MIN_TRENDING_PICKS && (tagVoices[t.tag]?.size ?? 0) >= MIN_TRENDING_VOICES)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  // One pool, used twice: the carousel at the top and, further down, a
  // headline every few picks so a thin timeline still has something in
  // it between posts.
  // 60 rather than 26: merging five outlets by date buries CBS, which is
  // the one that ships images, and the carousel went half placeholders.
  // A wider pool leaves roughly twenty image-bearing items to choose from.
  const newsPool = await fetchNewsMixed(newsLeaguesFor(preferred), 60)

  // The carousel is image cards, so images lead. Stable, so within the
  // ones that have a picture the newest still comes first — merging
  // several outlets by date had buried the only source that ships
  // images, and the rail went mostly blank placeholders.
  const newsTeaser = [...newsPool]
    .sort((a, b) => Number(!!b.image) - Number(!!a.image))
    .slice(0, 10)

  // Whatever the carousel didn't take, so nothing appears twice.
  const usedInRail = new Set(newsTeaser.map(n => n.link))
  // Only as many as a thin timeline can use; the rest would be payload
  // nobody scrolls to.
  const inlineNews = newsPool
    .filter(n => !usedInRail.has(n.link))
    // Same preference as the rail: a row with a thumbnail carries more
    // weight in a timeline than a line of text does.
    .sort((a, b) => Number(!!b.image) - Number(!!a.image))
    .slice(0, 8)


  // Why a pending pick isn't graded, when there's a reason worth showing.
  const withNotes = await attachPostMeta(supabase, shaped)

  return (
    <div>
      {tabs}
      {/* Above the scoreboard, and only for somebody who isn't signed in.
          Members know what this is; a stranger and an ad reviewer both
          arrive at a page whose first screen is otherwise point spreads. */}
      {!user && <WhatThisIs />}
      <Scoreboard games={await fetchRailGames(16, railLeaguesFor(preferred))} />

      {/* Logged-out only, once per browser. Signed-in people have
          already decided. */}
      {!user && <WelcomeModal remaining={foundingLeft} />}
      {!user && <JoinCard />}

      {tickerItems.length > 0 && (
        <div className="ticker-strip">
          {tickerItems.map((p: any) => (
            <Link key={p.id} href={tickerHref(p.tag)} className="ticker-item">
              {p.tag} <span className={p.sentiment}>{labelFor(p.sentiment, p.bet_type)}</span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ padding: '0 4px' }}>
        {trending.length > 0 && (
          <div className="trending-card">
            <div className="trending-title">Trending on {SITE_NAME}</div>
            {trending.map((t, i) => (
              <Link href={tickerHref(t.tag)} className="trend-row" key={t.tag}>
                <span className="trend-rank">{i + 1}</span>
                <span className="cashtag" style={{ fontSize: 12 }}>{t.tag}</span>
                <span style={{ flex: 1, color: 'var(--ink-dim)' }}>
                  {t.total} {t.total === 1 ? 'pick' : 'picks'}
                </span>
                <span className={`mono trend-pct ${toneFor(t.leader as any)}`}>
                  {t.pct}% {labelFor(t.leader as Direction)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Under the news, above the timeline. Highlights are the other
            thing a cold visitor can look at without an account, and they
            are the one that doesn't need reading. */}
        <ClipRail clips={await fetchClips(preferred, { limit: 12, perLeague: 2 })} />

        <NewsRail items={newsTeaser} />

        {/* Sits directly above the timeline it changes, rather than up
            with Home/Sports — those switch pages, this switches what one
            page is showing. */}
        {viewSwitch}

        {shaped.length === 0 && (
          <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
            {onlyFollowing
              ? 'Nobody you follow has posted yet. The everyone feed is still there.'
              : user
                ? 'No picks yet. Be the first to post one.'
                : 'No picks posted yet — the games above are live either way.'}
          </p>
        )}
        {/* A headline after every fifth pick. The timeline is thin while
            the site is new, and five is far enough apart that it reads as
            punctuation rather than as the feed being mostly news. */}
        {withNotes.flatMap((post: any, i: number) => {
          const rows = [<PostCard key={post.id} post={post} />]
          const nth = Math.floor(i / NEWS_EVERY)
          if ((i + 1) % NEWS_EVERY === 0 && inlineNews[nth]) {
            rows.push(<FeedNews key={inlineNews[nth].link} item={inlineNews[nth]} />)
          }
          return rows
        })}
      </div>
    </div>
  )
}
