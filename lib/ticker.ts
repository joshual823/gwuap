/**
 * A tag is the whole string a user typed — "$LAL -4.5". The ticker is
 * just the leading token, "$LAL", and it's what groups posts together.
 * Postgres derives it on write; this mirrors that for display and links.
 */
export function tickerOf(tag: string | null | undefined): string | null {
  if (!tag) return null
  const first = tag.trim().split(/\s+/)[0]
  return first ? first.toUpperCase() : null
}

/** Cashtag page URL. The $ is dropped so the path stays clean. */
export function tickerHref(tag: string | null | undefined): string {
  const ticker = tickerOf(tag) ?? ''
  return `/tag/${encodeURIComponent(ticker.replace(/^\$/, ''))}`
}
