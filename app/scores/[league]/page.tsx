import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGamesWindow, LEAGUES_WITH_SCORES, postHrefForGame, type Game } from '@/lib/scores'

export const dynamic = 'force-dynamic'

function GameRow({ game }: { game: Game }) {
  return (
    <Link href={postHrefForGame(game)} className="score-row">
      <div className="score-teams">
        <div className="score-side">
          <span className="score-team">{game.away.code}</span>
          {game.state !== 'pre' && <span className="score-num">{game.away.score}</span>}
        </div>
        <div className="score-side">
          <span className="score-team">{game.home.code}</span>
          {game.state !== 'pre' && <span className="score-num">{game.home.score}</span>}
        </div>
      </div>
      <div className="score-meta">
        <span className={`score-status ${game.state}`}>
          {game.state === 'in' && <span className="live-dot" />}{game.status}
        </span>
        {game.spread && <span className="score-line">{game.spread}</span>}
        {game.overUnder != null && <span className="score-line dim">o/u {game.overUnder}</span>}
      </div>
      <span className="score-cta">Post →</span>
    </Link>
  )
}

export default async function LeagueScoresPage(props: { params: Promise<{ league: string }> }) {
  const params = await props.params
  const league = decodeURIComponent(params.league)
  if (!LEAGUES_WITH_SCORES.includes(league)) notFound()

  const games = await fetchGamesWindow(league)
  const live = games.filter(g => g.state === 'in')
  const upcoming = games.filter(g => g.state === 'pre')
  // Three days of baseball is ~90 finished games. Nobody scrolls that.
  const recent = games.filter(g => g.state === 'post').reverse().slice(0, 24)

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/scores" className="back-link">← All scores</Link>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 2px' }}>{league}</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 8 }}>
        Tap any game to post a pick on it.
      </p>

      {games.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
          No {league} games in the last few days or the next few.
        </p>
      )}

      {live.length > 0 && <h2 className="comments-heading">Live now</h2>}
      {live.map(g => <GameRow key={g.id} game={g} />)}

      {upcoming.length > 0 && <h2 className="comments-heading">Starting soon</h2>}
      {upcoming.map(g => <GameRow key={g.id} game={g} />)}

      {recent.length > 0 && <h2 className="comments-heading">Last few days</h2>}
      {recent.map(g => <GameRow key={g.id} game={g} />)}
    </div>
  )
}
