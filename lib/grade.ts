import type { Game } from './scores'
import {
  isPeriodBet, isPeriodSideBet, periodsFor, PERIOD_BETS,
  type Direction, type BetType,
} from './odds'

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
export const GRADEABLE_BET_TYPES: BetType[] = [
  'moneyline', 'spread', 'total',
  // Settled from the period scores the scoreboard carries. A player prop
  // still can't be: it needs a box score, not a scoreline.
  'first_inning', 'first_five', 'first_five_ml', 'first_half', 'first_half_ml',
]

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
  // Only a finished game settles anything. A game that was postponed or
  // abandoned never reaches 'post' on the scoreboard, so it simply stays
  // pending rather than being guessed at.
  if (isGradeable(pick.betType) && game.state !== 'post') return { blocked: 'not-final' }
  return settle(pick, game)
}

/**
 * Where a pick stands right now, mid-game.
 *
 * The same arithmetic as grading, without the requirement that the game
 * be over. Nothing writes this to the database — it exists so someone
 * watching a game can see whether they're up without opening their
 * sportsbook, which is most of why they'd leave the page.
 */
export function projectPick(pick: GradeInput, game: Game): Outcome | null {
  const r = settle(pick, game)
  return 'outcome' in r ? r.outcome : null
}

function overUnder(actual: number, line: number, sentiment: Direction): GradeResult {
  if (actual === line) return { outcome: 'push' }
  const wentOver = actual > line
  if (sentiment === 'over') return { outcome: wentOver ? 'win' : 'loss' }
  if (sentiment === 'under') return { outcome: wentOver ? 'loss' : 'win' }
  // Posted as backing/fading, which names no side of a total.
  return { blocked: 'no-side' }
}

function settle(pick: GradeInput, game: Game): GradeResult {
  if (!isGradeable(pick.betType)) return { blocked: 'unsupported-bet' }

  const away = scoreOf(game.away)
  const home = scoreOf(game.home)
  if (away === null || home === null) return { blocked: 'no-score' }

  // A bet on part of a game — innings for baseball, quarters or halves
  // for the rest.
  if (isPeriodBet(pick.betType)) {
    // How many periods make a half depends on the league, so a half bet
    // on a sport with no halves has nowhere to land.
    const periods = periodsFor(pick.betType, game.league)
    if (periods === null) return { blocked: 'unsupported-bet' }

    const partial = (byPeriod: string[] | undefined) => {
      if (!byPeriod || byPeriod.length < periods) return null
      let sum = 0
      for (let i = 0; i < periods; i++) {
        const n = Number(byPeriod[i])
        if (!Number.isFinite(n)) return null
        sum += n
      }
      return sum
    }

    // A game can end before the periods a bet covers — rain in the
    // fourth, a walk-off in the ninth that never reaches the bottom.
    // Refusing is the only honest answer; a partial sum would settle a
    // bet on innings that were never played.
    const a = partial(game.away.byPeriod)
    const h = partial(game.home.byPeriod)
    if (a === null || h === null) return { blocked: 'no-score' }

    // Who was ahead when the period ended. Priced three ways, so a tie
    // is its own result rather than a push on the team bets.
    if (isPeriodSideBet(pick.betType)) {
      const code = normaliseCode(pick.ticker)
      if (!code) return { blocked: 'team-not-in-game' }
      const awayCode = normaliseCode(game.away.code)
      const homeCode = normaliseCode(game.home.code)

      let picked: number, opponent: number
      if (code === awayCode) { picked = a; opponent = h }
      else if (code === homeCode) { picked = h; opponent = a }
      else return { blocked: 'team-not-in-game' }

      if (pick.sentiment === 'tie') return { outcome: picked === opponent ? 'win' : 'loss' }
      if (pick.sentiment === 'backing') return { outcome: picked > opponent ? 'win' : 'loss' }
      if (pick.sentiment === 'fading') return { outcome: opponent > picked ? 'win' : 'loss' }
      return { blocked: 'no-side' }
    }

    const spec = PERIOD_BETS[pick.betType]
    const line = pick.line ?? spec.defaultLine ?? null
    if (line === null) return { blocked: 'missing-line' }
    return overUnder(a + h, line, pick.sentiment)
  }

  if (pick.betType === 'total') {
    if (pick.line === null) return { blocked: 'missing-line' }
    const combined = away + home
    return overUnder(combined, pick.line, pick.sentiment)
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
