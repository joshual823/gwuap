import { BET_TYPES, type BetType } from './odds'

/**
 * What a record actually looks like, broken down.
 *
 * The profile shows three numbers — record, win rate, profit — which
 * answers "is this person any good" and nothing else. The questions a
 * bettor actually has about their own history are narrower: am I better
 * at totals than sides, do I do worse on college football, am I on a
 * run or is that just what the last two look like.
 *
 * Nobody works that out by hand, which is why almost nobody knows their
 * own numbers. It's also the one thing on this site that is useful with
 * a userbase of one.
 *
 * Pure on purpose: rows in, summary out, no database and no clock. The
 * page decides what to fetch; this decides what it means.
 */

export type Settled = {
  status: 'win' | 'loss' | 'push' | 'void'
  profit: number | null
  game_league: string | null
  bet_type: string | null
  odds_source: string | null
  graded_at: string | null
  created_at: string
}

export type Split = {
  key: string
  label: string
  wins: number
  losses: number
  pushes: number
  /** Null until there's at least one decided pick — 0% is a claim, blank isn't. */
  winPct: number | null
  profit: number
  decided: number
}

export type Record = {
  wins: number
  losses: number
  pushes: number
  decided: number
  winPct: number | null
  /** Only picks priced from a book. Self-reported money isn't a record. */
  profit: number
  byLeague: Split[]
  byBetType: Split[]
  /** Most recent first: what the last ten decided picks did. */
  form: ('win' | 'loss' | 'push')[]
  /** Positive for a winning run, negative for a losing one, 0 for neither. */
  streak: number
  bestStreak: number
}

/** Pushes and voids don't decide anything, so they're not in the rate. */
const decidedOnly = (s: Settled['status']) => s === 'win' || s === 'loss'

function pct(wins: number, decided: number): number | null {
  if (decided === 0) return null
  return Math.round((wins / decided) * 1000) / 10
}

function summarise(key: string, label: string, rows: Settled[]): Split {
  const wins = rows.filter(r => r.status === 'win').length
  const losses = rows.filter(r => r.status === 'loss').length
  const pushes = rows.filter(r => r.status === 'push').length
  const decided = wins + losses
  const profit = rows
    .filter(r => r.odds_source === 'book')
    .reduce((sum, r) => sum + (r.profit ?? 0), 0)
  return { key, label, wins, losses, pushes, decided, winPct: pct(wins, decided), profit }
}

const BET_LABEL = new Map(BET_TYPES.map(b => [b.value as string, b.label]))

/** Newest first, which is the order every caller wants to read it in. */
function newestFirst(rows: Settled[]): Settled[] {
  return [...rows].sort((a, b) =>
    Date.parse(b.graded_at ?? b.created_at) - Date.parse(a.graded_at ?? a.created_at))
}

export function buildRecord(picks: Settled[]): Record {
  const rows = newestFirst(picks)
  const overall = summarise('all', 'Overall', rows)

  const group = (of: (r: Settled) => string | null, label: (k: string) => string): Split[] => {
    const buckets = new Map<string, Settled[]>()
    for (const r of rows) {
      const k = of(r)
      if (!k) continue
      const list = buckets.get(k) ?? []
      list.push(r)
      buckets.set(k, list)
    }
    return [...buckets.entries()]
      .map(([k, list]) => summarise(k, label(k), list))
      // Most-played first. A split with one pick in it isn't a finding,
      // and sorting by win rate would put it at the top every time.
      .sort((a, b) => (b.wins + b.losses + b.pushes) - (a.wins + a.losses + a.pushes))
  }

  const decided = rows.filter(r => decidedOnly(r.status))

  // Current run, from the most recent decided pick backwards.
  let streak = 0
  for (const r of decided) {
    if (streak === 0) streak = r.status === 'win' ? 1 : -1
    else if (streak > 0 && r.status === 'win') streak++
    else if (streak < 0 && r.status === 'loss') streak--
    else break
  }

  // Longest winning run anywhere in the history.
  let best = 0, run = 0
  for (const r of [...decided].reverse()) {
    run = r.status === 'win' ? run + 1 : 0
    if (run > best) best = run
  }

  return {
    ...overall,
    byLeague: group(r => r.game_league, k => k),
    byBetType: group(r => r.bet_type, k => BET_LABEL.get(k) ?? k),
    form: decided.slice(0, 10).map(r => r.status as 'win' | 'loss'),
    streak,
    bestStreak: best,
  }
}
