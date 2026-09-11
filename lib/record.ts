import { BET_TYPES, type BetType } from './odds'
import { MIN_GRADED_PICKS } from './rules'

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
  /**
   * Posted after the grace window following kick-off.
   *
   * Graded like any other pick, and kept out of the record: somebody who
   * posts at twenty minutes did call something, but it isn't the same
   * claim as a pick made before the whistle, and one record holding both
   * would quietly overstate what it means. Split, never silently mixed.
   */
  late_entry?: boolean | null
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

/** The two piles: picks that count toward the record, and late entries. */
export function splitLateEntries<T extends Settled>(picks: T[]): { onTime: T[]; late: T[] } {
  const onTime: T[] = []
  const late: T[] = []
  for (const p of picks) (p.late_entry ? late : onTime).push(p)
  return { onTime, late }
}

/**
 * The record. **Late entries are excluded**, and the caller is expected
 * to have split them off — `buildRecord` filters defensively anyway,
 * because a record that silently included them would be wrong in the one
 * direction this site cannot afford to be wrong in.
 */
export function buildRecord(picks: Settled[]): Record {
  const rows = newestFirst(picks.filter(p => !p.late_entry))
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

/** One member's line on a squad leaderboard. */
export type Standing = Split & {
  userId: string
  /** Too few settled picks to mean much yet — shown, but not trusted. */
  provisional: boolean
}

/**
 * A squad's table.
 *
 * The reason squads exist rather than a chat room: a Discord server has
 * no idea who in it was actually right, and this does. So every member
 * appears, including the ones who haven't posted — a standings table
 * that hides the people at the bottom isn't standings.
 *
 * Ranked on win rate, but only among people who have settled anything.
 * The site leaderboard needs five graded picks to appear at all; that's
 * the right bar for a public board and the wrong one for a group of six,
 * where it would show nobody. So a thin record is ranked and flagged
 * instead of hidden — 1-0 is displayed as 1-0, marked provisional, and
 * doesn't get to look like a season.
 */
export function standings(
  picks: (Settled & { author_id: string })[],
  memberIds: string[],
): Standing[] {
  const byAuthor = new Map<string, Settled[]>()
  // A leaderboard ranks claims made before the whistle. Late entries are
  // real picks and belong on a profile, not in a ranking against people
  // who posted early.
  for (const p of picks.filter(p => !p.late_entry)) {
    const list = byAuthor.get(p.author_id) ?? []
    list.push(p)
    byAuthor.set(p.author_id, list)
  }

  const rows: Standing[] = memberIds.map(id => {
    const split = summarise(id, id, byAuthor.get(id) ?? [])
    return { ...split, userId: id, provisional: split.decided < MIN_GRADED_PICKS }
  })

  return rows.sort((a, b) => {
    // Anybody with a settled pick outranks anybody without one: an empty
    // record isn't a good one.
    if ((a.decided === 0) !== (b.decided === 0)) return a.decided === 0 ? 1 : -1
    if (a.winPct !== b.winPct) return (b.winPct ?? 0) - (a.winPct ?? 0)
    // Same rate, more picks: the longer record is the better evidence.
    if (a.decided !== b.decided) return b.decided - a.decided
    return b.profit - a.profit
  })
}
