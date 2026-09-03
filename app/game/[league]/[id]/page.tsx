import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGameDetail, fetchGames, postHrefForGame, postHrefForMarket, LEAGUES_WITH_SCORES } from '@/lib/scores'
import LiveRefresh from './LiveRefresh'
import GameChat from './GameChat'
import WatchButton from '@/components/WatchButton'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function GamePage(props: {
  params: Promise<{ league: string; id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await props.params
  const search = await props.searchParams
  const tab = search.tab === 'chat' ? 'chat' : 'game'
  const league = decodeURIComponent(params.league)
  if (!LEAGUES_WITH_SCORES.includes(league)) notFound()

  const detail = await fetchGameDetail(league, params.id)
  if (!detail) notFound()

  // The pick link needs the scoreboard's view of the game (it carries the
  // line), so find it there rather than rebuilding it from the summary.
  const game = (await fetchGames(league)).find(g => g.id === params.id)

  const live = detail.state === 'in'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: watchRows } = user
    ? await supabase.from('watchlist').select('ticker').eq('user_id', user.id)
    : { data: [] }
  const watchedCodes = (watchRows ?? []).map((w: any) => String(w.ticker).toUpperCase())
  const gameKey = `${league}:${params.id}`
  const base = `/game/${encodeURIComponent(league)}/${encodeURIComponent(params.id)}`

  return (
    <div style={{ marginTop: 16 }}>
      <LiveRefresh active={live} />
      <Link href={`/scores/${encodeURIComponent(league)}`} className="back-link">← {league}</Link>

      <div className={`gd-head lg-${league.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
        <span className="game-league">{league}</span>
        <WatchButton ticker={gameKey} league={league} kind="game" viewerId={user?.id ?? null}
          initiallyWatched={watchedCodes.includes(gameKey.toUpperCase())} label />
        <span className={`gd-status ${detail.state}`}>
          {live && <span className="live-dot" />}{detail.status}
        </span>
      </div>

      <div className="gd-tabs">
        <Link href={base} className={`gd-tab ${tab === 'game' ? 'active' : ''}`}>Game</Link>
        <Link href={`${base}?tab=chat`} className={`gd-tab ${tab === 'chat' ? 'active' : ''}`}>Chat</Link>
      </div>

      {tab === 'chat' ? (
        <>
          <div className="gc-score">
            {detail.sides.map((side, n) => (
              <div className="gc-score-side" key={n}>
                {side.logo && <img src={side.logo} alt="" className="gc-logo" loading="lazy" />}
                <span className="gc-code">{side.code}</span>
                <span className="gc-num">{side.score ?? '–'}</span>
              </div>
            ))}
            <span className={`gc-state ${detail.state}`}>
              {live && <span className="live-dot" />}{detail.status}
            </span>
          </div>
          {detail.lastPlay && (
            <div className="gc-play">
              {detail.lastPlayKind && <strong>{detail.lastPlayKind}</strong>}
              <span>{detail.lastPlay}</span>
            </div>
          )}
          <GameChat gameKey={`${league}:${params.id}`} viewerId={user?.id ?? null} />
        </>
      ) : (<>

      <table className="gd-box">
        <thead>
          <tr>
            <th />
            {detail.periods.map(p => <th key={p}>{p}</th>)}
            <th className="gd-total">T</th>
          </tr>
        </thead>
        <tbody>
          {detail.sides.map(side => (
            <tr key={side.code}>
              <td className="gd-team">
                {side.logo && <img src={side.logo} alt="" className="gd-logo" loading="lazy" />}
                {side.label ?? side.code}
                {side.record && <span className="gd-record">{side.record}</span>}
                <WatchButton ticker={side.code} league={league} viewerId={user?.id ?? null}
                  initiallyWatched={watchedCodes.includes(side.code.toUpperCase())} />
              </td>
              {detail.periods.map((p, i) => <td key={p}>{side.byPeriod[i] ?? '–'}</td>)}
              <td className="gd-total">{side.score ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail.lastPlay && (
        <p className="gd-lastplay"><strong>Last play</strong> {detail.lastPlay}</p>
      )}

      {detail.summary && (
        <p className="gd-lastplay"><strong>Result</strong> {detail.summary}</p>
      )}

      {(detail.odds.length > 0 || detail.venue || detail.broadcast) && (
        <div className="gd-facts">
          {detail.odds.map(o => (
            <span key={o.label}><span className="gd-k">{o.label}</span> {o.value}</span>
          ))}
          {detail.broadcast && <span><span className="gd-k">TV</span> {detail.broadcast}</span>}
          {detail.venue && <span><span className="gd-k">At</span> {detail.venue}</span>}
        </div>
      )}

      {/* Real prices, tapped rather than typed. The whole reason this is
          here instead of a blank odds field is that a pick posted from a
          market is a selection with a provenance, while a typed one is a
          claim — and only one of those is worth putting on a leaderboard. */}
      {game && (game.markets?.length ?? 0) > 0 && (
        <div className="markets">
          <div className="markets-head">
            <span>Post a pick</span>
            {game.book && <span className="markets-book">odds from {game.book}</span>}
          </div>
          {(['moneyline', 'spread', 'total'] as const).map(kind => {
            const row = game.markets!.filter(m => m.kind === kind)
            if (row.length === 0) return null
            return (
              <div className="market-row" key={kind}>
                <span className="market-kind">
                  {kind === 'moneyline' ? 'Moneyline' : kind === 'spread' ? 'Spread' : 'Total'}
                </span>
                {row.map(m => (
                  <Link key={`${m.kind}-${m.side}`} href={postHrefForMarket(game, m)} className="market-btn">
                    <span className="market-pick">{m.label}</span>
                    <span className="market-odds">{m.odds}</span>
                  </Link>
                ))}
              </div>
            )
          })}
          <Link href={postHrefForGame(game)} className="market-custom">
            Something else — post a custom pick
          </Link>
        </div>
      )}

      {game && (game.markets?.length ?? 0) === 0 && (
        <Link href={postHrefForGame(game)} className="btn gd-post">
          Post a pick on this game
        </Link>
      )}

      {live && (
        <p className="gd-note">Updating every 30 seconds while the game is on.</p>
      )}
      </>)}
    </div>
  )
}
