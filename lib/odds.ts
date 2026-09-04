// Shared betting math and formatting.
//
// Odds are stored the way US sportsbooks quote them ("American odds"):
//   +150  →  risk $100 to win $150   (underdog)
//   -110  →  risk $110 to win $100   (favorite)
// The magnitude is never below 100 — "+100" / "-100" is an even bet — so
// anything smaller is rejected as a typo rather than silently mis-priced.

export type BetType =
  | 'moneyline' | 'spread' | 'total'
  | 'first_inning' | 'first_five' | 'first_five_ml'
  | 'first_half' | 'first_half_ml'
  | 'player_prop' | 'team_prop' | 'parlay' | 'future' | 'other'
export type PickStatus = 'pending' | 'win' | 'loss' | 'push' | 'void'

/**
 * A take is a cashtag, a direction, and something to say — no money on
 * it. A pick is a real wager. Only picks touch the record.
 */
export type PostKind = 'take' | 'pick'

/**
 * Which way you're leaning. Team bets are backing/fading; totals and
 * props are over/under — "backing the Over" isn't a thing anyone says.
 */
export type Direction = 'backing' | 'fading' | 'over' | 'under' | 'neutral' | 'tie'

/** Bet types priced on a number rather than a side. */
const OVER_UNDER_BETS: BetType[] = [
  'total', 'first_inning', 'first_five', 'first_half',
  'player_prop', 'team_prop',
]

/** Part-of-game bets settled by who's ahead rather than by a number. */
const PERIOD_SIDE_BETS: BetType[] = ['first_five_ml', 'first_half_ml']

/**
 * Bets on part of a game, and which periods each one covers.
 *
 * Innings for baseball, quarters for football — the scoreboard numbers
 * them the same way, so one map covers both. NRFI is a total of 0.5 over
 * the first inning: no runs and the under wins.
 */
export const PERIOD_BETS: Record<string, { periods: number | 'half'; defaultLine?: number }> = {
  first_inning: { periods: 1, defaultLine: 0.5 },
  first_five: { periods: 5 },
  first_five_ml: { periods: 5 },
  first_half: { periods: 'half' },
  first_half_ml: { periods: 'half' },
}

/**
 * How many scoreboard periods make up a half, per league.
 *
 * Not a constant, because "first half" isn't one thing: football and the
 * NBA are quartered so a half is two of them, college basketball is
 * already halved so it's one. Hockey has three periods and no half at
 * all, and ESPN publishes no line scores for soccer — so neither is
 * listed, and a half bet on them can't be offered or graded.
 */
const HALF_PERIODS: Record<string, number> = {
  'NFL': 2,
  'College Football': 2,
  'NBA': 2,
  'College Basketball': 1,
}

export function periodsFor(betType: BetType, league: string): number | null {
  const spec = PERIOD_BETS[betType]
  if (!spec) return null
  if (spec.periods === 'half') return HALF_PERIODS[league] ?? null
  return spec.periods
}

/** Which leagues a part-of-game bet makes sense in. */
export function periodBetsFor(league: string): BetType[] {
  if (league === 'MLB') return ['first_inning', 'first_five', 'first_five_ml']
  if (league in HALF_PERIODS) return ['first_half', 'first_half_ml']
  return []
}

export function isPeriodBet(betType: BetType): boolean {
  return betType in PERIOD_BETS
}

export function isPeriodSideBet(betType: BetType): boolean {
  return PERIOD_SIDE_BETS.includes(betType)
}

/**
 * How a direction is written when it's shown on its own — the ticker, the
 * trending rows. Same words the post form offers, from one place, so what
 * someone picks is what the feed prints back. Without this the raw column
 * value leaks to the page and reads as "backing".
 */
const DIRECTION_LABELS: Record<Direction, string> = {
  backing: 'Backing',
  fading: 'Fading',
  over: 'Over',
  under: 'Under',
  neutral: 'Neutral',
  tie: 'Tie',
}

/**
 * What a direction is called on a bet of this kind.
 *
 * "Under" is right for a total and wrong for a first-inning bet, which
 * everyone calls NRFI. A direction on its own doesn't carry enough to
 * name itself once bets are about part of a game.
 */
const DIRECTION_BY_BET: Partial<Record<BetType, Partial<Record<Direction, string>>>> = {
  first_inning: { over: 'YRFI', under: 'NRFI' },
  first_five: { over: 'Over F5', under: 'Under F5' },
  first_half: { over: 'Over 1H', under: 'Under 1H' },
  first_five_ml: { backing: 'Leads at 5', fading: 'Trails at 5', tie: 'Tied at 5' },
  first_half_ml: { backing: 'Leads at half', fading: 'Trails at half', tie: 'Tied at half' },
}

export function labelFor(d: Direction, betType?: BetType | null): string {
  if (betType) {
    const specific = DIRECTION_BY_BET[betType]?.[d]
    if (specific) return specific
  }
  return DIRECTION_LABELS[d] ?? d
}

export function directionsFor(
  kind: PostKind, betType: BetType, teams?: { primary?: string; secondary?: string },
): { value: Direction; label: string }[] {
  // "Was there a run in the first?" is a yes/no question. Calling it
  // over/under 0.5 is technically what it is and nobody says it that way.
  if (kind === 'pick' && betType === 'first_inning') {
    return [{ value: 'over', label: 'Yes — a run scores' }, { value: 'under', label: 'No run (NRFI)' }]
  }

  // Who's ahead when the period ends, three ways. Tie is a real outcome
  // here rather than a push, which is how these are priced.
  if (kind === 'pick' && PERIOD_SIDE_BETS.includes(betType)) {
    const a = teams?.primary?.trim() || 'First team'
    const b = teams?.secondary?.trim() || 'Other team'
    return [
      { value: 'backing', label: `${a} ahead` },
      { value: 'fading', label: `${b} ahead` },
      { value: 'tie', label: 'Tie' },
    ]
  }

  if (kind === 'pick' && OVER_UNDER_BETS.includes(betType)) {
    return [{ value: 'over', label: 'Over' }, { value: 'under', label: 'Under' }]
  }
  const sides: { value: Direction; label: string }[] = [
    { value: 'backing', label: 'Backing' },
    { value: 'fading', label: 'Fading' },
  ]
  // Takes can sit on the fence — you're offering a read, not a wager.
  // Picks can't: money is on a side by definition.
  if (kind === 'take') sides.splice(1, 0, { value: 'neutral', label: 'Neutral' })
  return sides
}

/** True for the "more / yes" side, which the UI paints green. */
export function isBullish(d: Direction): boolean {
  return d === 'backing' || d === 'over'
}

/**
 * Three-way colour: neutral must not be painted red just because it
 * isn't bullish. Anything reading a direction for colour should use
 * this rather than isBullish alone.
 */
export function toneFor(d: Direction): 'up' | 'down' | 'flat' {
  if (d === 'neutral') return 'flat'
  return isBullish(d) ? 'up' : 'down'
}

/**
 * Props are priced on a number far more often than not — points, yards,
 * strikeouts — so Over/Under is the right default. Yes/no props (anytime
 * scorer, double-double) don't fit it, and there's no data yet on how
 * often people post those, so they're steered to "Other" with a hint
 * rather than given their own machinery.
 */
export function isPropBet(kind: PostKind, betType: BetType): boolean {
  return kind === 'pick' && (betType === 'player_prop' || betType === 'team_prop')
}

/** Totals sit on a game, so they get an optional opponent cashtag. */
export function wantsMatchup(kind: PostKind, betType: BetType): boolean {
  // Anything on the whole game or part of it is on the fixture, not on
  // one side, so it carries both teams.
  return kind === 'pick' && (betType === 'total' || isPeriodBet(betType))
}

/**
 * Whether an opponent cashtag is offered at all.
 *
 * Wider than wantsMatchup, and the difference is required vs allowed. A
 * total is *about* a fixture, so both sides belong to it and the label
 * above the direction buttons becomes Over/Under. A take is about
 * whatever the person wants to talk about — most often a matchup, since
 * that's what there is to argue over. Restricting it to one side meant
 * no take could be posted on a game, a match or a fight, which is most
 * of them.
 *
 * Left optional for takes. "$LAL are done" is still a take, and forcing
 * a second cashtag onto it would invent an opponent nobody named.
 */
export function allowsOpponent(kind: PostKind, betType: BetType): boolean {
  return kind === 'take' || wantsMatchup(kind, betType)
}

/**
 * Split American odds into the sign and digits the form holds separately.
 *
 * Shared so the two places that do it — filling the form from a link, and
 * putting a book's price back after an edit — can't disagree about the
 * format. If they did, a pick posted at the book's number would compare
 * unequal to it and silently count as custom.
 */
export function splitAmericanOdds(text: string | null | undefined): { sign: '+' | '-'; digits: string } | null {
  const match = /^([+-]?)(\d{3,6})$/.exec(String(text ?? '').trim())
  if (!match) return null
  return { sign: match[1] === '+' ? '+' : '-', digits: match[2] }
}

/** The canonical way a price is written, so comparisons are safe. */
export function formatAmericanOdds(text: string | null | undefined): string | null {
  const parts = splitAmericanOdds(text)
  return parts ? `${parts.sign}${parts.digits}` : null
}

/** One tap covers most real prices; -110 is the standard spread/total juice. */
export const QUICK_ODDS = ['-110', '-120', '+100', '+120', '+150', '+200']

// Note: a "total" IS the over/under — they're the same bet, so there's
// no separate O/U entry. Player props are broken out because they're the
// most common casual bet and lumping them into "other" would tell us
// nothing later.
export const BET_TYPES: { value: BetType; label: string; short?: string }[] = [
  { value: 'moneyline', label: 'Moneyline' },
  { value: 'spread', label: 'Spread' },
  { value: 'total', label: 'Total (O/U)', short: 'Total' },
  // Bets on part of a game. Settled from the period scores the
  // scoreboard already carries — innings for baseball, quarters for
  // football — so they grade themselves like any other.
  { value: 'first_inning', label: 'First inning — run or no run', short: '1st inning' },
  { value: 'first_five', label: 'First 5 innings — total', short: 'First 5' },
  { value: 'first_five_ml', label: 'First 5 innings — who leads', short: 'First 5' },
  { value: 'first_half', label: 'First half — total', short: 'First half' },
  { value: 'first_half_ml', label: 'First half — who leads', short: 'First half' },
  { value: 'player_prop', label: 'Player prop' },
  { value: 'team_prop', label: 'Team prop' },
  { value: 'parlay', label: 'Parlay' },
  { value: 'future', label: 'Future' },
  { value: 'other', label: 'Other' },
]

/** Quick-select stake amounts, in dollars. */
export const STAKE_PRESETS = [10, 25, 50, 100, 250]

export const MIN_ODDS = 100
export const MAX_ODDS = 100000
export const MAX_STAKE = 1000000

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Parse stored odds text ("+150", "-110") into a signed number.
 * Returns null if it isn't a well-formed American odds value.
 */
export function parseAmericanOdds(odds: string | null | undefined): number | null {
  if (!odds) return null
  const m = /^([+-])(\d+)$/.exec(odds.trim())
  if (!m) return null
  const magnitude = parseInt(m[2], 10)
  if (magnitude < MIN_ODDS || magnitude > MAX_ODDS) return null
  return m[1] === '-' ? -magnitude : magnitude
}

/** Dollars this stake wins if the pick hits. Profit only — the stake itself comes back separately. */
export function profitOnWin(oddsValue: number, stake: number): number {
  if (oddsValue > 0) return round2(stake * (oddsValue / 100))
  return round2(stake * (100 / Math.abs(oddsValue)))
}

/** Total returned by the book on a win: stake back plus profit. */
export function payoutOnWin(oddsValue: number, stake: number): number {
  return round2(stake + profitOnWin(oddsValue, stake))
}

/**
 * The dollar result of a graded pick. Null when it can't be computed —
 * still pending, or missing/garbled odds or stake.
 */
export function profitForStatus(
  status: PickStatus,
  odds: string | null | undefined,
  stake: number | null | undefined,
): number | null {
  if (status === 'pending') return null
  if (stake == null) return null
  if (status === 'push' || status === 'void') return 0
  if (status === 'loss') return round2(-stake)
  const oddsValue = parseAmericanOdds(odds)
  if (oddsValue === null) return null
  return profitOnWin(oddsValue, stake)
}

/**
 * Whether a settled pick failing to price is actually a problem.
 *
 * It is only a problem when money was claimed. Since money became
 * opt-in, most picks carry no stake at all — that's the whole free-to-
 * play case — and profitForStatus returns null for every one of them.
 * Reading that null as "a win we can't price" sends a perfectly good
 * result to the review queue instead of onto somebody's record.
 *
 * A pick with no stake settles on its record and carries no profit,
 * which is exactly what the leaderboard expects: it counts wins by
 * status and only ever sums profit for book-priced picks.
 */
export function pricingNeedsReview(
  status: PickStatus,
  odds: string | null | undefined,
  stake: number | null | undefined,
): boolean {
  // Nothing was staked, so there is nothing to price and nothing wrong.
  if (stake == null) return false
  if (status === 'void') return false
  return profitForStatus(status, odds, stake) === null
}

/** "$50", "$45.45", "-$1,250.50" — cents shown only when there are any. */
export function formatUsd(n: number): string {
  const rounded = round2(n)
  const abs = Math.abs(rounded)
  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${rounded < 0 ? '-' : ''}$${body}`
}

/** Same, but always carries an explicit sign: "+$45.45", "-$50". */
export function formatSignedUsd(n: number): string {
  const rounded = round2(n)
  return rounded > 0 ? `+${formatUsd(rounded)}` : formatUsd(rounded)
}
