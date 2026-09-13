import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { fetchGames, gameHref, LEAGUES_WITH_SCORES, type Game } from '@/lib/scores'
import { tickerHref } from '@/lib/ticker'
import PostCard from '@/components/PostCard'
import { attachPostMeta } from '@/lib/postMeta'
import WatchButton from '@/components/WatchButton'
import WatchlistAutoClean from '@/components/WatchlistAutoClean'

/**
 * How long after kickoff a fixture is safely over.
 *
 * We know when a game started, never when it ended — by the time it
 * matters the scoreboard has rolled past it, so there is nothing left to
 * ask. Four hours covers a baseball game into extras or a tennis match
 * that goes five sets, and the setting promises "about a day after it
 * ends", so 4 + 24 is the honest reading of that.
 */
const OVER_AFTER_MS = 28 * 60 * 60 * 1000

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/watchlist')

  const { data: profile } = await supabase
    .from('profiles').select('watchlist_autoclean').eq('id', user.id).maybeSingle()
  const autoClean = Boolean(profile?.watchlist_autoclean)

  // Tidy before reading, so the page never renders a row it is about to
  // delete. Games only — a watched team has no end, and quietly
  // unfollowing somebody's team because it hasn't played this week would
  // be a bug wearing a feature's clothes.
  //
  // Rows starred before migration 054 have no starts_at and are left
  // alone rather than guessed at: deleting on a hunch is worse than a
  // stale star somebody can remove themselves.
  if (autoClean) {
    await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('kind', 'game')
      .not('starts_at', 'is', null)
      .lt('starts_at', new Date(Date.now() - OVER_AFTER_MS).toISOString())
  }

  const { data: rows, error: watchError } = await supabase
    .from('watchlist')
    .select('ticker, league, kind')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (watchError) {
    return (
      <div style={{ marginTop: 24 }}>
        <h1 className="display" style={{ fontSize: 22 }}>Watchlist</h1>
        <p style={{ color: 'var(--bear)', fontSize: 14, marginTop: 12 }}>
          Couldn't load your watchlist: {watchError.message}
        </p>
      </div>
    )
  }

  const all = (rows ?? []) as { ticker: string; league: string | null; kind: string | null }[]
  const watched = all.filter(w => w.kind !== 'game')
  const watchedGames = all.filter(w => w.kind === 'game')
  const codes = watched.map(w => w.ticker)

  if (all.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 6 }}>Watchlist</h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.5 }}>
          Nothing here yet. Star a team from a game page or a cashtag page and
          their games and posts collect here.
        </p>
        <Link href="/scores" className="btn" style={{ marginTop: 16, display: 'inline-block' }}>
          Browse games
        </Link>
      </div>
    )
  }

  // Only fetch leagues actually being watched.
  const leagues = [...new Set(all.map(w => w.league).filter(Boolean) as string[])]
    .filter(l => LEAGUES_WITH_SCORES.includes(l))
  const allGames = (await Promise.all(leagues.map(l => fetchGames(l)))).flat()
  // A game is watched either directly, or because one of its sides is.
  const pinned = new Set(watchedGames.map(w => w.ticker.toUpperCase()))
  const games: Game[] = allGames.filter(g =>
    pinned.has(`${g.league}:${g.id}`.toUpperCase())
    || codes.includes(g.home.code.toUpperCase())
    || codes.includes(g.away.code.toUpperCase()),
  ).slice(0, 12)

  const tagFilters = codes.map(c => `"$${c}"`)
  const { data: posts } = codes.length === 0 ? { data: [] } : await supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, tag2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey!inner ( id, username, avatar_url, is_banned ),
      category:categories ( name ),
      likes ( user_id, emoji ),
      comments ( id )
    `)
    .or(`ticker.in.(${tagFilters.join(',')}),ticker2.in.(${tagFilters.join(',')})`)
    .eq('author.is_banned', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const shaped = (posts ?? []).map((p: any) => ({
    ...p,
    comment_count: p.comments?.length ?? 0,
    viewer_id: user.id,
  }))


  // Why a pending pick isn't graded, when there's a reason worth showing.
  const withNotes = await attachPostMeta(supabase, shaped)

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 10 }}>Watchlist</h1>

      <div className="chip-row">
        {watched.map(w => (
          <Link key={w.ticker} href={tickerHref(`$${w.ticker}`)} className="chip">${w.ticker}</Link>
        ))}
      </div>

      {/* Only once there's something to tidy. The empty state above
          returns early, so reaching here already means the list has
          rows — a switch offered before the problem exists is one more
          thing to read on a page that hasn't earned it yet. */}
      <WatchlistAutoClean viewerId={user.id} initial={autoClean} />

      {games.length > 0 && <h2 className="comments-heading">Their games</h2>}
      {games.map(g => (
        <Link href={gameHref(g)} key={`${g.league}-${g.id}`} className="score-row">
          <div className="score-teams">
            <div className="score-side">
              <span className="score-team">{g.away.code}</span>
              {g.state !== 'pre' && <span className="score-num">{g.away.score}</span>}
            </div>
            <div className="score-side">
              <span className="score-team">{g.home.code}</span>
              {g.state !== 'pre' && <span className="score-num">{g.home.score}</span>}
            </div>
          </div>
          <div className="score-meta">
            <span className={`score-status ${g.state}`}>
              {g.state === 'in' && <span className="live-dot" />}{g.status}
            </span>
            {g.spread && <span className="score-line">{g.spread}</span>}
          </div>
          <span className="score-cta">Open →</span>
        </Link>
      ))}

      <h2 className="comments-heading">Latest posts</h2>
      {shaped.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
          Nobody's posted on these yet. Be first.
        </p>
      )}
      {withNotes.map((post: any) => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
