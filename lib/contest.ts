/**
 * The launch contest. One place, because the prize and the deadline
 * appear on the banner, the contest page and the share preview, and
 * three copies would drift the moment one changed.
 */
export const CONTEST = {
  /** The whole pool. `payouts` is how it's split. */
  prize: 300,
  /**
   * First, second, third. Split rather than winner-takes-all because one
   * prize means everybody not leading by the weekend stops caring, and
   * the point of the contest is people still posting on the last day.
   */
  payouts: [150, 100, 50],
  /**
   * Noon UTC on the closing day, so no timezone argues about the cutoff.
   *
   * The Tuesday after NFL Week 1: Monday night finishes late on the 14th,
   * the overnight grading run settles it, and the board is final before
   * this passes. Closing any earlier would strand the last game's picks
   * ungraded at the moment the prize is decided.
   */
  endsAt: new Date('2026-09-15T12:00:00Z'),
  endsLabel: 'September 15',
  /** Graded picks needed to appear on the leaderboard at all. */
  minPicks: 5,
} as const

export function daysLeft(now: Date = new Date()): number {
  const ms = CONTEST.endsAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function hasEnded(now: Date = new Date()): boolean {
  return now.getTime() >= CONTEST.endsAt.getTime()
}

/**
 * How the deadline is written.
 *
 * A date for most of the run and a day count only in the last week. A
 * counter reading "27 days" tells someone they can safely come back
 * later, which is the opposite of what a countdown is for — urgency is
 * only honest when the deadline is actually close.
 */
/** True only inside the last week, when a day count is honest urgency. */
export function isClosingSoon(now: Date = new Date()): boolean {
  return !hasEnded(now) && daysLeft(now) <= 7
}

export function deadlineLabel(now: Date = new Date()): string {
  if (hasEnded(now)) return 'Closed'
  const days = daysLeft(now)
  if (days > 7) return `Ends ${CONTEST.endsLabel}`
  if (days <= 1) return 'Ends today'
  return `${days} days left`
}
