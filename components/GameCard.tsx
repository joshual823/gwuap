import Link from 'next/link'
import { gameHref, type Game } from '@/lib/scores'

function leagueSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * One game, as a card.
 *
 * Shared by the feed rail and the league pages so the two can't drift
 * apart — the rail sizes it with a fixed width, a grid lets it fill its
 * cell, and neither knows anything about the other's layout.
 */
export default function GameCard({ game, className = '', ...rest }: {
  game: Game
  className?: string
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={gameHref(game)}
      className={`game lg-${leagueSlug(game.league)} ${game.state === 'in' ? 'is-live' : ''} ${className}`}
      {...rest}
    >
      <div className="game-top">
        <span className="game-league">{game.league}</span>
        {game.state === 'in' && <span className="game-live"><span className="live-dot" />LIVE</span>}
      </div>

      {[game.away, game.home].map((side, n) => (
        <div className="game-row" key={n}>
          <span className="game-side">
            {side.logo && <img src={side.logo} alt="" className="game-logo" loading="lazy" />}
            <span className="game-team">{side.label ?? side.code}</span>
          </span>
          {game.state !== 'pre' && <span className="game-score">{side.score}</span>}
        </div>
      ))}

      <div className={`game-status ${game.state}`}>{game.status}</div>

      {(game.spread || game.overUnder != null) && (
        <div className="game-odds">
          {game.spread && <span>{game.spread}</span>}
          {game.overUnder != null && <span className="game-ou">o/u {game.overUnder}</span>}
        </div>
      )}
    </Link>
  )
}
