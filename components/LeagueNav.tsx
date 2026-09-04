import Link from 'next/link'
import { LEAGUES_WITH_SCORES } from '@/lib/scores'

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Jump between leagues without going back first.
 *
 * A scrolling row rather than a dropdown: ten leagues fit, the active
 * one is visible rather than hidden behind a tap, and it's the pattern
 * every sports app already uses. Each chip carries its league's accent
 * so the row reads as a set of sports rather than a set of words.
 */
export default function LeagueNav({ active }: { active?: string }) {
  return (
    <nav className="league-nav" aria-label="Leagues">
      <Link href="/scores" className={`league-chip-nav ${!active ? 'active' : ''}`}>
        All
      </Link>
      {LEAGUES_WITH_SCORES.map(league => (
        <Link
          key={league}
          href={`/scores/${encodeURIComponent(league)}`}
          className={`league-chip-nav lg-${slug(league)} ${active === league ? 'active' : ''}`}
          aria-current={active === league ? 'page' : undefined}
        >
          {league}
        </Link>
      ))}
    </nav>
  )
}
