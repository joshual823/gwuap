import Link from 'next/link'
import { gameHref, type Game } from '@/lib/scores'
import ScoreRail from './ScoreRail'
import GameCard from './GameCard'

/** Colour per league, so the board reads as a live board rather than a grey list. */
function leagueSlug(league: string): string {
  return league.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * An auto-scrolling rail of games. Tapping one opens the post form with
 * the matchup and line already filled in. The track is rendered twice so
 * the loop is seamless; ScoreRail handles the motion.
 */
export default function Scoreboard({ games, title = 'Today', href, autoScroll = true }: {
  games: Game[]
  title?: string
  /** Makes the section heading a link — used by the Scores page. */
  href?: string
  /** Off on the Scores page: there you're browsing, not glancing. */
  autoScroll?: boolean
}) {
  if (games.length === 0) return null

  // Too few to loop convincingly — just show them.
  const marquee = autoScroll && games.length >= 5
  const track = marquee ? [...games, ...games] : games

  return (
    <div className="board">
      <div className="board-head">
        {href
          ? <Link href={href} className="board-title board-title-link">{title}</Link>
          : <span className="board-title">{title}</span>}
        {href
          ? <Link href={href} className="board-more">See all →</Link>
          : <span className="board-hint">tap a game for live detail</span>}
      </div>
      <ScoreRail loop={marquee}>
          {track.map((game, i) => (
            <GameCard
              game={game}
              key={`${game.league}-${game.id}-${i}`}
              aria-hidden={marquee && i >= games.length ? true : undefined}
              tabIndex={marquee && i >= games.length ? -1 : undefined}
            />
          ))}
      </ScoreRail>
    </div>
  )
}
