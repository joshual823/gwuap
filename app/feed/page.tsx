import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import NewsList from '@/components/NewsList'
import { fetchNews, NEWS_LEAGUES } from '@/lib/news'
import { toneFor } from '@/lib/odds'
import { tickerOf, tickerHref } from '@/lib/ticker'
import { fetchRailGames } from '@/lib/scores'
import Scoreboard from '@/components/Scoreboard'
import JoinCard from '@/components/JoinCard'
import NewsRail from '@/components/NewsRail'
import { SITE_NAME } from '@/lib/brand'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FeedPage(props: {
  searchParams: Promise<{ tab?: string; league?: string }>
}) {
  const searchParams = await props.searchParams
  const tab = searchParams.tab === 'news' ? 'news' : 'home'
  const newsLeague = NEWS_LEAGUES.includes(searchParams.league ?? '')
    ? (searchParams.league as string)
    : 'Top'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tabs = (
    <div className="feed-tabs">
      <Link href="/feed" className={`feed-tab ${tab === 'home' ? 'active' : ''}`}>Home</Link>
      <Link href="/feed?tab=news" className={`feed-tab ${tab === 'news' ? 'active' : ''}`}>News</Link>
    </div>
  )

  // News needs no account. It's the one thing a cold visitor can actually
  // look at, which is the entire reason it exists — gating it behind
  // signup would show it only to people who are already convinced.
  if (tab === 'news') {
    const items = await fetchNews(newsLeague)
    return (
      <div>
        {tabs}
        <div className="chip-row">
          {NEWS_LEAGUES.map(lg => (
            <Link key={lg} href={`/feed?tab=news&league=${encodeURIComponent(lg)}`}
              className={`chip ${lg === newsLeague ? 'active' : ''}`}>{lg}</Link>
          ))}
        </div>
        {!user && <JoinCard />}
        <NewsList items={items} league={newsLeague === 'Top' ? 'Other' : newsLeague} />
      </div>
    )
  }

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
  for (const p of shaped) {
    for (const t of [p.ticker ?? tickerOf(p.tag), p.ticker2 ?? tickerOf(p.tag2)]) {
      if (!t) continue
      tagCounts[t] = tagCounts[t] ?? {}
      tagCounts[t][p.sentiment] = (tagCounts[t][p.sentiment] ?? 0) + 1
    }
  }
  const trending = Object.entries(tagCounts)
    .map(([tag, counts]) => {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
      const total = entries.reduce((sum, [, n]) => sum + n, 0)
      const [leader, leadCount] = entries[0]
      return { tag, total, leader, pct: Math.round((100 * leadCount) / total) }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  // Home keeps three headlines as a prompt, not as feed content — the
  // timeline itself stays real picks by real people.
  const newsTeaser = (await fetchNews('Top', 10))

  return (
    <div>
      {tabs}
      <Scoreboard games={await fetchRailGames()} />

      {!user && <JoinCard />}

      {tickerItems.length > 0 && (
        <div className="ticker-strip">
          {tickerItems.map((p: any) => (
            <Link key={p.id} href={tickerHref(p.tag)} className="ticker-item">
              {p.tag} <span className={p.sentiment}>{p.sentiment}</span>
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
                <span style={{ flex: 1, color: 'var(--ink-dim)' }}>{t.total} picks</span>
                <span className={`mono trend-pct ${toneFor(t.leader as any)}`}>
                  {t.pct}% {t.leader}
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
        {shaped.map((post: any) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
