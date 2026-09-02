import Link from 'next/link'
import { postHrefForGame, type Game } from '@/lib/scores'

/**
 * A horizontally scrolling rail of games. Tapping one opens the post
 * form with the matchup and the line already filled in — which is both
 * the fastest way to post and the reason a game is worth showing.
 */
export default function Scoreboard({ games, title = 'Today' }: {
  games: Game[]
  title?: string
}) {
  if (games.length === 0) return null

  return (
    <div className="board">
      <div className="board-head">
        <span className="board-title">{title}</span>
        <span className="board-hint">tap a game to post on it</span>
      </div>
      <div className="board-rail">
        {games.map(game => (
          <Link href={postHrefForGame(game)} key={`${game.league}-${game.id}`} className="game">
            <div className="game-top">
              <span className="game-league">{game.league}</span>
              <span className={`game-status ${game.state}`}>
                {game.state === 'in' && <span className="live-dot" />}
                {game.status}
              </span>
            </div>

            <div className="game-row">
              <span className="game-team">{game.away.code}</span>
              {game.state !== 'pre' && <span className="game-score">{game.away.score}</span>}
            </div>
            <div className="game-row">
              <span className="game-team">{game.home.code}</span>
              {game.state !== 'pre' && <span className="game-score">{game.home.score}</span>}
            </div>

            {(game.spread || game.overUnder != null) && (
              <div className="game-odds">
                {game.spread && <span>{game.spread}</span>}
                {game.overUnder != null && <span className="game-ou">o/u {game.overUnder}</span>}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
