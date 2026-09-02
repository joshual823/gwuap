import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGameDetail, fetchGames, postHrefForGame, LEAGUES_WITH_SCORES } from '@/lib/scores'
import LiveRefresh from './LiveRefresh'

export const dynamic = 'force-dynamic'

export default async function GamePage(props: {
  params: Promise<{ league: string; id: string }>
}) {
  const params = await props.params
  const league = decodeURIComponent(params.league)
  if (!LEAGUES_WITH_SCORES.includes(league)) notFound()

  const detail = await fetchGameDetail(league, params.id)
  if (!detail) notFound()

  // The pick link needs the scoreboard's view of the game (it carries the
  // line), so find it there rather than rebuilding it from the summary.
  const game = (await fetchGames(league)).find(g => g.id === params.id)

  const live = detail.state === 'in'

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
    </div>
  )
}
