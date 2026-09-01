// Shared betting math and formatting.
//
// Odds are stored the way US sportsbooks quote them ("American odds"):
//   +150  →  risk $100 to win $150   (underdog)
//   -110  →  risk $110 to win $100   (favorite)
// The magnitude is never below 100 — "+100" / "-100" is an even bet — so
// anything smaller is rejected as a typo rather than silently mis-priced.

export type BetType =
  | 'moneyline' | 'spread' | 'total'
  | 'player_prop' | 'team_prop' | 'parlay' | 'future' | 'other'
export type PickStatus = 'pending' | 'win' | 'loss' | 'push' | 'void'

// Note: a "total" IS the over/under — they're the same bet, so there's
// no separate O/U entry. Player props are broken out because they're the
// most common casual bet and lumping them into "other" would tell us
// nothing later.
export const BET_TYPES: { value: BetType; label: string }[] = [
  { value: 'moneyline', label: 'Moneyline' },
  { value: 'spread', label: 'Spread' },
  { value: 'total', label: 'Total (O/U)' },
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
