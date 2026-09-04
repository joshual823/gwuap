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
  /** When the pick was written. Checked against the game's kick-off. */
  createdAt?: string | null
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
  | 'late-entry'         // posted more than five minutes into the game
  | 'line-not-from-book' // a number the book never published

export type GradeResult =
  | { outcome: Outcome }
  | { blocked: Blocked }

/** Blocked states a person has to resolve; the rest resolve themselves. */
export const NEEDS_REVIEW: Blocked[] = [
  'no-score', 'team-not-in-game', 'missing-line', 'no-side',
  'late-entry', 'line-not-from-book',
]

export function needsReview(reason: Blocked): boolean {
  return NEEDS_REVIEW.includes(reason)
}

export const BLOCKED_LABELS: Record<Blocked, string> = {
  'not-final': 'Game has not finished',
  'no-score': 'Game finished but the scoreboard has no final score',
  'unsupported-bet': 'This kind of pick cannot be settled from a scoreline',
  'team-not-in-game': 'The cashtag does not name either side of this game',
  'missing-line': 'No spread or total was recorded on the pick',
  'no-side': 'The direction does not name a side of this pick',
  'late-entry': 'Posted more than five minutes after this game started',
  'line-not-from-book': 'The number on this pick is not one the book published for this game',
}

/**
 * Every reason that can end up in posts.grade_note, in English.
 *
 * Wider than BLOCKED_LABELS because the grading job writes one note the
 * grader itself never produces: a pick it settled but couldn't price.
 * That one used to reach the admin queue as the bare word "unpriceable".
 */
export const GRADE_NOTE_LABELS: Record<string, string> = {
  ...BLOCKED_LABELS,
  unpriceable: 'Settled, but the payout could not be priced from the odds and amount on the pick',
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
  // Both of these compare against the scoreboard's own numbers rather
  // than anything stored on the pick. The row was written by whoever
  // posted it, so every field on it is a claim; the game is the fact.

  // Posted after the first pitch. At worst that's a pick made with the
  // result already known, which grades as a guaranteed win — so it never
  // grades at all.
  if (isLateEntry(pick, game)) return { blocked: 'late-entry' }

  // A number nobody was offering. Left free, "under 1,000,000" wins every
  // time and "over 1" wins the rest.
  if (!lineIsFromBook(pick, game)) return { blocked: 'line-not-from-book' }

  // Only a finished game settles anything. A game that was postponed or
  // abandoned never reaches 'post' on the scoreboard, so it simply stays
  // pending rather than being guessed at.
  if (isGradeable(pick.betType) && game.state !== 'post') return { blocked: 'not-final' }
  return settle(pick, game)
}

/**
 * How long after the first pitch a pick still counts.
 *
 * Not zero, because kick-off times drift by a minute or two and someone
 * who tapped Post as the whistle went shouldn't lose their pick to that.
 * Five minutes is short enough that nothing is decided inside it and
 * long enough to cover the drift.
 */
export const LATE_ENTRY_GRACE_MS = 5 * 60 * 1000

/**
 * Was this posted late enough that the result was already forming?
 *
 * Against the scoreboard's kick-off, never the one stored on the pick.
 * game_starts_at is sent by the client, so a forged one would wave
 * through exactly the pick this is meant to stop.
 */
export function isLateEntry(pick: GradeInput, game: Game): boolean {
  if (!pick.createdAt || !game.startsAt) return false
  const posted = Date.parse(pick.createdAt)
  const start = Date.parse(game.startsAt)
  if (!Number.isFinite(posted) || !Number.isFinite(start)) return false
  return posted >= start + LATE_ENTRY_GRACE_MS
}

/**
 * What share of a game's total belongs to the part being bet on.
 *
 * The book prices whole games and nothing else, so a first-five total has
 * no published number anywhere. Deriving it from the one number that IS
 * published keeps it anchored to the market and, more importantly, out of
 * the hands of the person posting the pick — which was the whole problem.
 *
 * Five innings of nine is 0.55 rather than a half. A half really is a
 * half. Both are one edit if the numbers turn out to read wrong.
 */
export const PERIOD_TOTAL_SHARE: Record<string, number> = {
  first_five: 0.55,
  first_half: 0.5,
}

/** The site's line for a part-of-game total, or null if the book priced no total. */
export function periodTotalLine(betType: BetType, fullGameTotal: number | null | undefined): number | null {
  const share = PERIOD_TOTAL_SHARE[betType]
  if (share === undefined) return null
  if (typeof fullGameTotal !== 'number' || !Number.isFinite(fullGameTotal)) return null
  // To the nearest half, so it can't land on a whole number and push.
  return Math.round(fullGameTotal * share * 2) / 2
}

/**
 * Every number the book actually published for this game, either side.
 *
 * A spread is quoted from both ends — one side's -3.5 is the other's
 * +3.5 — so both belong in the set or half of all honest picks fail.
 */
export function bookLinesFor(game: Game, betType: BetType): number[] {
  const out: number[] = []
  const add = (n: number | null | undefined) => {
    if (typeof n === 'number' && Number.isFinite(n)) { out.push(n, -n) }
  }
  for (const m of game.markets ?? []) {
    if (betType === 'total' && m.kind === 'total') add(m.line)
    if (betType === 'spread' && m.kind === 'spread') add(m.line)
  }
  // The scoreboard carries its own headline numbers even when pickcenter
  // returned nothing, which is common once a game has finished.
  if (betType === 'total') add(game.overUnder)
  if (betType === 'spread' && game.spread) {
    const m = /(-?\d+(?:\.\d+)?)/.exec(game.spread)
    if (m) add(Number(m[1]))
  }
  return [...new Set(out)]
}

/**
 * Only the two whole-game markets are checked, because they're the only
 * two the book prices. Period totals have no published line to compare
 * against — see the note on first_five in odds.ts.
 */
export function lineIsFromBook(pick: GradeInput, game: Game): boolean {
  if (pick.line == null) return true          // 'missing-line' handles this

  // A part-of-game total is checked against the line the site derived,
  // which is the only line it ever had. The form fills it in and won't
  // let it be edited, so anything else arrived by another route.
  if (pick.betType in PERIOD_TOTAL_SHARE) {
    const derived = periodTotalLine(pick.betType, game.overUnder)
    // No total was ever published for this game, so there was nothing to
    // derive from and nothing to check against.
    if (derived === null) return true
    return Math.abs(derived - pick.line) < 1e-9
  }

  if (pick.betType !== 'total' && pick.betType !== 'spread') return true
  const allowed = bookLinesFor(game, pick.betType)
  // Nothing published at all. Refusing here would flag every honest pick
  // on a game ESPN never priced, so it falls through to be graded and
  // the number stands.
  if (allowed.length === 0) return true
  return allowed.some(n => Math.abs(n - (pick.line as number)) < 1e-9)
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
