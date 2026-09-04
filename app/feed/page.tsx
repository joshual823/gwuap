import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
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
import { FOUNDING_LIMIT } from '@/lib/badges'
import NewsRail from '@/components/NewsRail'
import FeedTabs from '@/components/FeedTabs'
import { SITE_NAME } from '@/lib/brand'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FeedPage(props: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
      .from('profiles').select('*', { count: 'exact', head: true })
      .contains('badges', ['founding'])
    if (count !== null) foundingLeft = Math.max(0, FOUNDING_LIMIT - count)
  }

  const tabs = <FeedTabs active="home" />

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
      author:profiles!posts_author_id_fkey!inner ( id, username, avatar_url, is_banned ),
      category:categories ( name ),
      likes ( user_id, emoji ),
      comments ( id )
    `)
    // Banning set a flag that only the leaderboard respected; the feed
    // still carried the banned user's posts.
    .eq('author.is_banned', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (blockedIds.length > 0) {
    query = query.not('author_id', 'in', `(${blockedIds.join(',')})`)
  }

  const { data: posts } = await query

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
  // Two different people, so a tag can't be talked into trending alone.
  const MIN_TRENDING_VOICES = 2

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

  // Home keeps three headlines as a prompt, not as feed content — the
  // timeline itself stays real picks by real people.
  const newsTeaser = (await fetchNewsMixed(newsLeaguesFor(preferred), 10))


  // Why a pending pick isn't graded, when there's a reason worth showing.
  const withNotes = await attachPostMeta(supabase, shaped)

  return (
    <div>
      {tabs}
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

        <NewsRail items={newsTeaser} />

        {shaped.length === 0 && (
          <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
            {user
              ? 'No picks yet. Be the first to post one.'
              : 'No picks posted yet — the games above are live either way.'}
          </p>
        )}
        {withNotes.map((post: any) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
