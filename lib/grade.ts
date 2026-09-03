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

/**
 * Why a pick wasn't graded. The distinction that matters is `waiting`:
 * a game that hasn't finished is the system working, and everything else
 * is a pick that will sit pending forever unless a person looks at it.
 *
 * Before a cash prize, silence was survivable. With one, a pick that
 * never grades and never explains itself reads as the contest being
 * rigged — so every refusal now says which kind it is.
 */
export type Blocked =
  | 'not-final'          // the game is still on, or hasn't started
  | 'no-score'           // finished, but the scoreboard has no numbers
  | 'unsupported-bet'    // parlay, prop, future — no scoreline settles it
  | 'team-not-in-game'   // the tag names neither side
  | 'missing-line'       // a spread or total with no number
  | 'no-side'            // a direction that doesn't pick a side

export type GradeResult =
  | { outcome: Outcome }
  | { blocked: Blocked }

/** Blocked states a person has to resolve; the rest resolve themselves. */
export const NEEDS_REVIEW: Blocked[] = [
  'no-score', 'team-not-in-game', 'missing-line', 'no-side',
]

export function needsReview(reason: Blocked): boolean {
  return NEEDS_REVIEW.includes(reason)
}

export const BLOCKED_LABELS: Record<Blocked, string> = {
  'not-final': 'Game has not finished',
  'no-score': 'Game finished but the scoreboard has no final score',
  'unsupported-bet': 'Bet type cannot be settled from a scoreline',
  'team-not-in-game': 'The cashtag does not name either side of this game',
  'missing-line': 'No spread or total was recorded on the pick',
  'no-side': 'The direction does not pick a side of this bet',
}

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
export function gradePick(pick: GradeInput, game: Game): GradeResult {
  if (!isGradeable(pick.betType)) return { blocked: 'unsupported-bet' }

  // Only a finished game settles anything. A game that was postponed or
  // abandoned never reaches 'post' on the scoreboard, so it simply stays
  // pending rather than being guessed at.
  if (game.state !== 'post') return { blocked: 'not-final' }

  const away = scoreOf(game.away)
  const home = scoreOf(game.home)
  if (away === null || home === null) return { blocked: 'no-score' }

  if (pick.betType === 'total') {
    if (pick.line === null) return { blocked: 'missing-line' }
    const combined = away + home
    if (combined === pick.line) return { outcome: 'push' }
    const wentOver = combined > pick.line
    if (pick.sentiment === 'over') return { outcome: wentOver ? 'win' : 'loss' }
    if (pick.sentiment === 'under') return { outcome: wentOver ? 'loss' : 'win' }
    // A total posted as backing/fading has no side to settle.
    return { blocked: 'no-side' }
  }

  // Moneyline and spread are both about one named team, so the pick has
  // to name a team that's actually playing. A tag that doesn't match
  // either side is a freehand cashtag, not a bet on this fixture.
  const code = normaliseCode(pick.ticker)
  if (!code) return { blocked: 'team-not-in-game' }

  const awayCode = normaliseCode(game.away.code)
  const homeCode = normaliseCode(game.home.code)

  let picked: number
  let opponent: number
  if (code === awayCode) { picked = away; opponent = home }
  else if (code === homeCode) { picked = home; opponent = away }
  else return { blocked: 'team-not-in-game' }

  // Backing is on the named team, fading is against it. Anything else
  // (over/under on a side bet, neutral) has no side to settle.
  const backing = pick.sentiment === 'backing'
  if (!backing && pick.sentiment !== 'fading') return { blocked: 'no-side' }

  // The spread applies to the named team whichever way the pick leans:
  // "$SF -3.5" is San Francisco giving 3.5, and fading it is taking the
  // other side of that same number.
  const margin = pick.betType === 'spread'
    ? picked + (pick.line ?? 0) - opponent
    : picked - opponent

  if (pick.betType === 'spread' && pick.line === null) return { blocked: 'missing-line' }

  if (margin === 0) return { outcome: 'push' }
  const namedTeamCovered = margin > 0
  return { outcome: namedTeamCovered === backing ? 'win' : 'loss' }
}
