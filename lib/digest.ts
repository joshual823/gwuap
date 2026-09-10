import { SITE_NAME, SITE_URL } from './brand'
import { emailShell } from './email'
import { pickSummary } from './odds'

/**
 * What a notification digest says.
 *
 * Separate from the route that sends it so the email can be built
 * without a Resend key, a cron secret, or a live database — which is the
 * difference between reading one before it goes out and finding out what
 * it looks like from the person who received it.
 *
 * Pure: give it rows, get back a subject, HTML and a plain-text
 * alternative. Nothing here talks to the network.
 */

export type Notif = {
  id: string
  user_id: string
  type: string
  outcome: string | null
  post_id: string | null
  actor: { username: string } | null
}

/** Just enough of a post to say which pick this is about. */
export type Pick = {
  id: string
  tag: string | null
  tag2: string | null
  sentiment: string | null
  bet_type: string | null
  line: number | null
}

/** How many rows are spelled out before the digest starts counting. */
const MAX_ROWS = 8

function gradedVerb(outcome: string | null): string {
  return outcome === 'win' ? '<b>won</b>'
    : outcome === 'loss' ? '<b>lost</b>'
    : outcome === 'push' ? '<b>pushed</b>'
    : 'was settled'
}

export function line(n: Notif, pick?: Pick | null): string {
  const who = n.actor?.username ? `@${esc(n.actor.username)}` : 'Someone'
  switch (n.type) {
    case 'graded': {
      // Which pick, not just that one was graded. Somebody with four
      // picks running on a Sunday learns nothing from "your pick won",
      // and the answer shouldn't require opening the site.
      const what = pickSummary(pick ?? {})
      return `Your pick ${gradedVerb(n.outcome)}.`
        + (what ? `<span style="color:#7A838F"> ${esc(what)}</span>` : '')
    }
    case 'reaction': return `${who} reacted to your post.`
    case 'comment':  return `${who} commented on your post.`
    case 'reply':    return `${who} replied to you.`
    case 'follow':   return `${who} followed you.`
    case 'repost':   return `${who} reposted your pick.`
    case 'squad_invite': return `${who} invited you to a squad.`
    case 'dm_request': return `${who} wants to message you.`
    case 'dm_message': return `${who} sent you a message.`
    default: return `${who} did something.`
  }
}

/** HTML stripped, for a subject line or a text/plain part. */
const plain = (s: string) => s.replace(/<[^>]+>/g, '')

/**
 * Anything that came out of the database, on its way into an email.
 *
 * The app renders through React, which escapes for you. These emails are
 * built by joining strings, so they don't get that for free — and a
 * username had no format constraint in the database until 047, which
 * means this is defence rather than pedantry.
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function subjectFor(items: Notif[], picks: Map<string, Pick>): string {
  if (items.length === 1) {
    const only = items[0]
    if (only.type === 'graded') {
      // The cashtags only. The direction and the number belong in the
      // body — a subject line is truncated by every client there is.
      const pick = only.post_id ? picks.get(only.post_id) : null
      const on = pick?.tag ? ` — ${pick.tag}${pick.tag2 ? ` vs ${pick.tag2}` : ''}` : ''
      return (only.outcome === 'win' ? `Your pick won` : `Your pick was graded`) + on
    }
    return plain(line(only)).replace(/\.$/, '')
  }
  const graded = items.filter(i => i.type === 'graded').length
  if (graded === items.length) return `${graded} of your picks were graded`
  return `${items.length} new notifications on ${SITE_NAME}`
}

export function renderDigest(items: Notif[], picks: Map<string, Pick>): {
  subject: string
  html: string
  text: string
  href: string
} {
  const subject = subjectFor(items, picks)

  // When there's one graded row, the subject has already said "your pick
  // won" and named the teams — repeating it underneath reads as a
  // stutter. The row then carries only what the subject left out: which
  // way the pick went, and on what number.
  const lone = items.length === 1 && items[0].type === 'graded'

  // Every row that has a post is its own link, so a digest of four
  // graded picks is four ways in rather than one button to a list.
  const body = items.slice(0, MAX_ROWS).map(i => {
    const pick = i.post_id ? picks.get(i.post_id) : null
    // `line()` escapes what it interpolates; this branch skips it, so the
    // summary has to be escaped here or it goes into the HTML raw.
    const summary = lone ? pickSummary(pick ?? {}) : null
    const text = summary ? esc(summary) : line(i, pick)
    return i.post_id
      ? `<div style="margin:6px 0"><a href="${SITE_URL}/post/${i.post_id}"
           style="color:#ECEDEE;text-decoration:none">${text}</a></div>`
      : `<div style="margin:6px 0">${text}</div>`
  }).join('')

  const more = items.length > MAX_ROWS
    ? `<div style="margin:6px 0;color:#7A838F">…and ${items.length - MAX_ROWS} more.</div>`
    : ''

  const single = items.length === 1 && !!items[0].post_id
  const href = single ? `${SITE_URL}/post/${items[0].post_id}` : `${SITE_URL}/notifications`

  return {
    subject,
    href,
    html: emailShell({
      // Escaped on the way into HTML. The subject line itself is a mail
      // header and takes plain text, so it stays as it is.
      heading: esc(subject),
      // One pick, one link: the button says so rather than "open Gwuap".
      cta: { label: single ? 'See the pick' : 'Open Gwuap', href },
      body: body + more,
    }),
    // The plain-text part carries the links too — a client that won't
    // render HTML shouldn't leave someone with no way through. The
    // trailing link is dropped when there's one row, which already
    // printed the very same URL directly above it.
    text: items.map(i => {
      const pick = i.post_id ? picks.get(i.post_id) : null
      const t = plain((lone ? pickSummary(pick ?? {}) : null) ?? line(i, pick))
      return i.post_id ? `${t}\n${SITE_URL}/post/${i.post_id}` : t
    }).join('\n\n') + (single ? '' : `\n\n${href}`),
  }
}
