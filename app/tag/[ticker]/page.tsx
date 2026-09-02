import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import { isBullish } from '@/lib/odds'
import { fetchGames } from '@/lib/scores'
import WatchButton from '@/components/WatchButton'
import Scoreboard from '@/components/Scoreboard'

export const dynamic = 'force-dynamic'

/**
 * A cashtag stream — every pick and take on one team or player.
 *
 * This is the shared object the site was missing. Cashtags existed but
 * pointed nowhere, so Trending, the ticker and every card were dead
 * ends. Filters on `ticker`, which is derived from the tag, so
 * "$LAL -4.5" and "$LAL -3.5" land on the same page.
 */
export default async function TickerPage(props: { params: Promise<{ ticker: string }> }) {
  const params = await props.params
  // This value is interpolated into a PostgREST .or() filter, where commas
  // and dots are syntax rather than data. Tickers are short alphanumerics,
  // so anything else is dropped rather than escaped.
  const bare = decodeURIComponent(params.ticker)
    .replace(/^\$/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24)
  if (!bare) notFound()
  const ticker = `$${bare}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, tag2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey!inner ( id, username, avatar_url, is_banned ),
      category:categories ( name ),
      likes ( user_id, emoji ),
      comments ( id )
    `)
    .or(`ticker.eq.${ticker},ticker2.eq.${ticker}`)
    .eq('author.is_banned', false)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: watchRow } = user
    ? await supabase.from('watchlist').select('ticker').eq('user_id', user.id).eq('ticker', bare).maybeSingle()
    : { data: null }
  const watched = !!watchRow

  // A ticker only belongs to one league, so take it from the first post.
  // PostgREST returns a to-one embed as an object; the generated type says array.
  const league: string | null = ((posts ?? [])[0] as any)?.category?.name ?? null

  const shaped = (posts ?? []).map((p: any) => ({
    ...p,
    comment_count: p.comments?.length ?? 0,
    viewer_id: user?.id ?? null,
  }))

  // Sentiment split across everything posted on this cashtag.
  const counts: Record<string, number> = {}
  for (const p of shaped) counts[p.sentiment] = (counts[p.sentiment] ?? 0) + 1
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, n]) => sum + n, 0)

  return (
    <div style={{ marginTop: 20 }}>
      <div className="ticker-head">
        <h1 className="display mono" style={{ fontSize: 24, margin: 0 }}>{ticker}</h1>
        <WatchButton ticker={ticker} league={league} viewerId={user?.id ?? null}
          initiallyWatched={watched} label />
        <Link href={`/post/new?tag=${encodeURIComponent(ticker)}`} className="btn">Post on {ticker}</Link>
      </div>

      {total > 0 ? (
        <div className="ticker-split">
          {entries.map(([direction, n]) => (
            <span key={direction} className={`sentiment ${direction}`}>
              {direction} {Math.round((100 * n) / total)}%
            </span>
          ))}
          <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>
            {total} post{total === 1 ? '' : 's'}
          </span>
        </div>
      ) : (
        <p style={{ color: 'var(--ink-dim)', marginTop: 12 }}>
          Nothing posted on {ticker} yet. Be the first.
        </p>
      )}

      {league && <Scoreboard games={(await fetchGames(league)).filter(
        g => g.home.code.toUpperCase() === bare || g.away.code.toUpperCase() === bare,
      )} title={`${bare} games`} />}

      {shaped.map((post: any) => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
