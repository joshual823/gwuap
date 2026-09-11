import { line, type Notif, type Pick } from './digest'
import { SITE_NAME } from './brand'

/**
 * What a push notification says.
 *
 * Separate from the route that sends it, for the same reason
 * `digest.ts` is: this can be read and tested without VAPID keys, a cron
 * secret or a live database. Pure — rows in, payload out, nothing on the
 * network.
 */

export type PushPayload = {
  title: string
  body: string
  url: string
  /** Same tag replaces rather than stacks, so one run is one buzz. */
  tag: string
}

/** `line()` writes HTML for the email. A notification tray shows text. */
export function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * One push per person per run, never one per event.
 *
 * Three reactions and a reply is one buzz. The digest made this decision
 * for email already and it matters more here: an email people didn't
 * want is ignored, a phone that buzzes four times in a row gets its
 * notifications turned off, and that setting never comes back on.
 *
 * The newest event is the one named, because it's the one that just
 * happened — the rest are counted.
 */
export function pushPayload(items: Notif[], picks: Map<string, Pick>): PushPayload | null {
  if (items.length === 0) return null

  const newest = items[items.length - 1]
  const first = plain(line(newest, newest.post_id ? picks.get(newest.post_id) : null))
  const rest = items.length - 1

  return {
    title: SITE_NAME,
    body: rest > 0 ? `${first} and ${rest} more` : first,
    // Straight to the post when it's about one thing, so the tap lands
    // where the buzz was about rather than on a list.
    url: items.length === 1 && newest.post_id ? `/post/${newest.post_id}` : '/notifications',
    tag: items.length === 1 ? `gwuap-${newest.id}` : 'gwuap-batch',
  }
}
