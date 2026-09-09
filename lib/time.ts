/** Compact relative timestamp: 12m, 5h, 3d. */
export function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/**
 * A duration in words, for a sentence rather than a timestamp.
 *
 * `timeAgo` above is the compact form for a corner of a card — 12m, 5h,
 * 3d. This is the one that goes in prose, and the difference matters:
 * the post form told people their game "started 202 minutes ago", which
 * is a number nobody converts in their head. Past an hour, say hours.
 * Past a day, say days.
 *
 * Rounded down on purpose. "3 hours ago" for something 3h58m old is a
 * little wrong; "4 hours ago" for something 3h02m old is wrong in the
 * direction that makes people think the clock is broken.
 */
export function humanDuration(minutes: number): string {
  // Math.max(0, Math.floor(NaN)) is NaN, which walks all the way through
  // the branches below and comes out as "NaN months".
  if (!Number.isFinite(minutes)) return 'less than a minute'
  const mins = Math.max(0, Math.floor(minutes))
  if (mins < 1) return 'less than a minute'
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (mins < 60) return plural(mins, 'minute')

  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    const rest = mins % 60
    // Under six hours the minutes still carry information — the
    // difference between kick-off an hour ago and two is the difference
    // between a live game and a decided one. Past that they don't.
    return rest > 0 && hours < 6
      ? `${plural(hours, 'hour')} ${plural(rest, 'minute')}`
      : plural(hours, 'hour')
  }

  const days = Math.floor(hours / 24)
  if (days < 7) return plural(days, 'day')
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return plural(weeks, 'week')
  return plural(Math.floor(days / 30), 'month')
}
