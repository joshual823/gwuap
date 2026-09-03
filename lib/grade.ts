import type { Game } from './scores'
import type { Direction, BetType } from './odds'

/**
 * Settling a pick against a final score.
 *
 * Only three bet types can be settled this way. A moneyline, a spread and
 * a total are all decided by the two numbers on the scoreboard. A player
 * prop, a team prop, a parlay and a future are not — no scoreline says
 * whether a parlay's third leg hit — so they are never graded here and
 * never counted on the leaderboard.
 *
 * Everything in this file is pure and takes the score as an argument, so
 * it can be reasoned about without a network call.
 */

export type GradeInput = {
  betType: BetType
  sentiment: Direction
  /** First word of the tag, uppercased, dollar sign included: "$SF". */
  ticker: string | null
  /** Spread or total as a number: -3.5, or 47.5. */
  line: number | null
}

export type Outcome = 'win' | 'loss' | 'push' | 'void'

/** Bet types a final score can settle. Everything else is left alone. */
export const GRADEABLE_BET_TYPES: BetType[] = ['moneyline', 'spread', 'total']

export function isGradeable(betType: BetType): boolean {
  return GRADEABLE_BET_TYPES.includes(betType)
}

/** "$SF" and "sf" both become "SF", so a tag can be compared to a team code. */
function normaliseCode(v: string | null | undefined): string {
  return String(v ?? '').replace(/^\$/, '').toUpperCase().trim()
}

function scoreOf(side: { score: string | null }): number | null {
  const n = Number(side.score)
  return side.score != null && Number.isFinite(n) ? n : null
}

/**
 * Which outcome a pick deserves, or null when it can't be settled yet or
 * at all. Null is not a failure — it means leave the pick pending, which
 * is always the safe answer. Grading something wrong is far worse than
 * grading it late.
 */
export function gradePick(pick: GradeInput, game: Game): Outcome | null {
  if (!isGradeable(pick.betType)) return null

  // Only a finished game settles anything. A game that was postponed or
  // abandoned never reaches 'post' on the scoreboard, so it simply stays
  // pending rather than being guessed at.
  if (game.state !== 'post') return null

  const away = scoreOf(game.away)
  const home = scoreOf(game.home)
  if (away === null || home === null) return null

  if (pick.betType === 'total') {
    if (pick.line === null) return null
    const combined = away + home
    if (combined === pick.line) return 'push'
    const wentOver = combined > pick.line
    if (pick.sentiment === 'over') return wentOver ? 'win' : 'loss'
    if (pick.sentiment === 'under') return wentOver ? 'loss' : 'win'
    // A total posted as backing/fading has no side to settle.
    return null
  }

  // Moneyline and spread are both about one named team, so the pick has
  // to name a team that's actually playing. A tag that doesn't match
  // either side is a freehand cashtag, not a bet on this fixture.
  const code = normaliseCode(pick.ticker)
  if (!code) return null

  const awayCode = normaliseCode(game.away.code)
  const homeCode = normaliseCode(game.home.code)

  let picked: number
  let opponent: number
  if (code === awayCode) { picked = away; opponent = home }
  else if (code === homeCode) { picked = home; opponent = away }
  else return null

  // Backing is on the named team, fading is against it. Anything else
  // (over/under on a side bet, neutral) has no side to settle.
  const backing = pick.sentiment === 'backing'
  if (!backing && pick.sentiment !== 'fading') return null

  // The spread applies to the named team whichever way the pick leans:
  // "$SF -3.5" is San Francisco giving 3.5, and fading it is taking the
  // other side of that same number.
  const margin = pick.betType === 'spread'
    ? picked + (pick.line ?? 0) - opponent
    : picked - opponent

  if (pick.betType === 'spread' && pick.line === null) return null

  if (margin === 0) return 'push'
  const namedTeamCovered = margin > 0
  return namedTeamCovered === backing ? 'win' : 'loss'
}
