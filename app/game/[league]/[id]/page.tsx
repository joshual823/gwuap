import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGameDetail, fetchGames, postHrefForGame, LEAGUES_WITH_SCORES } from '@/lib/scores'
import LiveRefresh from './LiveRefresh'
import GameChat from './GameChat'
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
  const base = `/game/${encodeURIComponent(league)}/${encodeURIComponent(params.id)}`

  return (
    <div style={{ marginTop: 16 }}>
      <LiveRefresh active={live} />
      <Link href={`/scores/${encodeURIComponent(league)}`} className="back-link">← {league}</Link>

      <div className={`gd-head lg-${league.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
        <span className="game-league">{league}</span>
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
                {side.code}
                {side.record && <span className="gd-record">{side.record}</span>}
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

      {(detail.odds.length > 0 || detail.venue || detail.broadcast) && (
        <div className="gd-facts">
          {detail.odds.map(o => (
            <span key={o.label}><span className="gd-k">{o.label}</span> {o.value}</span>
          ))}
          {detail.broadcast && <span><span className="gd-k">TV</span> {detail.broadcast}</span>}
          {detail.venue && <span><span className="gd-k">At</span> {detail.venue}</span>}
        </div>
      )}

      {game && (
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
