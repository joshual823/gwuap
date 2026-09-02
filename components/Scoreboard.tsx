import Link from 'next/link'
import { postHrefForGame, type Game } from '@/lib/scores'
import ScoreRail from './ScoreRail'

/** Colour per league, so the board reads as a live board rather than a grey list. */
function leagueSlug(league: string): string {
  return league.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * An auto-scrolling rail of games. Tapping one opens the post form with
 * the matchup and line already filled in. The track is rendered twice so
 * the loop is seamless; ScoreRail handles the motion.
 */
export default function Scoreboard({ games, title = 'Today' }: {
  games: Game[]
  title?: string
}) {
  if (games.length === 0) return null

  // Too few to loop convincingly — just show them.
  const marquee = games.length >= 5
  const track = marquee ? [...games, ...games] : games

  return (
    <div className="board">
      <div className="board-head">
        <span className="board-title">{title}</span>
        <span className="board-hint">tap a game to post on it</span>
      </div>
      <ScoreRail loop={marquee}>
          {track.map((game, i) => (
            <Link
              href={postHrefForGame(game)}
              key={`${game.league}-${game.id}-${i}`}
              className={`game lg-${leagueSlug(game.league)} ${game.state === 'in' ? 'is-live' : ''}`}
              aria-hidden={marquee && i >= games.length ? true : undefined}
              tabIndex={marquee && i >= games.length ? -1 : undefined}
            >
              <div className="game-top">
                <span className="game-league">{game.league}</span>
                {game.state === 'in' && <span className="game-live"><span className="live-dot" />LIVE</span>}
              </div>

              <div className="game-row">
                <span className="game-team">{game.away.code}</span>
                {game.state !== 'pre' && <span className="game-score">{game.away.score}</span>}
              </div>
              <div className="game-row">
                <span className="game-team">{game.home.code}</span>
                {game.state !== 'pre' && <span className="game-score">{game.home.score}</span>}
              </div>

              <div className={`game-status ${game.state}`}>{game.status}</div>

              {(game.spread || game.overUnder != null) && (
                <div className="game-odds">
                  {game.spread && <span>{game.spread}</span>}
                  {game.overUnder != null && <span className="game-ou">o/u {game.overUnder}</span>}
                </div>
              )}
            </Link>
          ))}
      </ScoreRail>
    </div>
  )
}
