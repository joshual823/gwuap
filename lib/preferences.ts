import { RAIL_LEAGUES, LEAGUES_WITH_SCORES } from './scores'

/**
 * The leagues someone can say they follow.
 *
 * Kept in sync with the check constraint in migration 023 — the database
 * rejects anything outside this list, so adding a league here without
 * adding it there saves nothing and reports no error to the user.
 */
export const PICKABLE_LEAGUES = [
  'NFL', 'NBA', 'MLB', 'NHL',
  'College Football', 'College Basketball',
  'Soccer', 'Tennis', 'UFC', 'Boxing', 'Golf',
] as const

export const MAX_PREFERRED = 3

export function cleanPreferences(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((l): l is string => typeof l === 'string')
    .filter(l => (PICKABLE_LEAGUES as readonly string[]).includes(l))
    .slice(0, MAX_PREFERRED)
}

/**
 * Rail leagues for someone with these preferences, best first.
 *
 * Preferences lead, but the default mix always follows behind them. That
 * backfill is the whole point: someone who picks NFL, College Football
 * and NBA in June has chosen three leagues that aren't playing, and a
 * rail honouring that literally would be empty — which is exactly the
 * dead feed the scoreboard was added to fix. Because the rail interleaves
 * in order and stops when it's full, the backfill is invisible whenever
 * the chosen leagues have games on, and rescues the feed when they don't.
 */
export function railLeaguesFor(preferred: string[]): string[] {
  const wanted = preferred.filter(l => LEAGUES_WITH_SCORES.includes(l))
  return [...wanted, ...RAIL_LEAGUES.filter(l => !wanted.includes(l))]
}

/** Same idea for headlines: chosen leagues first, then everything. */
export function newsLeaguesFor(preferred: string[]): string[] {
  return preferred.length > 0 ? preferred : ['Top']
}
