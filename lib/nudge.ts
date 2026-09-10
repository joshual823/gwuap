import { SITE_NAME, SITE_URL } from './brand'
import { emailShell } from './email'

/**
 * The come-back email.
 *
 * Deliberately not "we miss you". Somebody who hasn't opened the site in
 * a week doesn't owe it a visit and won't be argued into one — the only
 * thing that earns an open is something worth reading, so this leads
 * with what actually happened and mentions the site second.
 *
 * Pure: rows in, an email out. No network, no clock beyond what it's
 * given, so the wording is tested rather than discovered in an inbox.
 */

export type NudgeItem = { title: string; href: string; detail?: string }

export type NudgeInput = {
  username: string
  /** How many come-back emails this person has already had. */
  sent: number
  headlines: NudgeItem[]
  clips: NudgeItem[]
  /** Their own settled picks since they were last here, if any. */
  gradedWhileAway: number
  /** Whether they're in a squad, which changes what to suggest. */
  inSquad: boolean
}

/**
 * The schedule: day 3, day 10, day 30, then nothing.
 *
 * Not daily. Somebody who hasn't come back in three days did not stop
 * for want of reminding, and a mail a day is how a young sending domain
 * earns a spam reputation it can't undo. Three, spaced out, and then it
 * stops on its own — an account that ignored all three has answered.
 */
export const NUDGE_DAYS = [3, 10, 30] as const
export const MAX_NUDGES = NUDGE_DAYS.length

/** Whether this person is due one, given how long they've been away. */
export function nudgeDue(daysAway: number, alreadySent: number): boolean {
  if (alreadySent >= MAX_NUDGES) return false
  const threshold = NUDGE_DAYS[alreadySent]
  return daysAway >= threshold
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function list(items: NudgeItem[]): string {
  return items.map(i => `
    <div style="margin:0 0 10px">
      <a href="${esc(i.href)}" style="color:#ECEDEE;text-decoration:none;font-weight:600">${esc(i.title)}</a>
      ${i.detail ? `<div style="color:#7A838F;font-size:13px;margin-top:2px">${esc(i.detail)}</div>` : ''}
    </div>`).join('')
}

export function renderNudge(input: NudgeInput): { subject: string; html: string; text: string } {
  const { username, headlines, clips, gradedWhileAway, inSquad } = input

  // The subject is the one thing everybody sees. Their own settled picks
  // beat anything else, because it's about them and it's news.
  const subject = gradedWhileAway > 0
    ? `${gradedWhileAway} of your picks ${gradedWhileAway === 1 ? 'was' : 'were'} settled while you were away`
    : headlines[0]
      ? headlines[0].title
      : `What's been happening on ${SITE_NAME}`

  const parts: string[] = []

  if (gradedWhileAway > 0) {
    parts.push(`<p style="margin:0 0 16px">The scoreboard settled
      <strong>${gradedWhileAway}</strong> of your picks since you were last here.
      <a href="${SITE_URL}/notifications" style="color:#00C805">See how they went</a>.</p>`)
  }

  if (headlines.length > 0) {
    parts.push(`<div style="font-size:13px;font-weight:700;letter-spacing:0.05em;
      text-transform:uppercase;color:#7A838F;margin:0 0 8px">Today in sports</div>${list(headlines)}`)
  }

  if (clips.length > 0) {
    parts.push(`<div style="font-size:13px;font-weight:700;letter-spacing:0.05em;
      text-transform:uppercase;color:#7A838F;margin:18px 0 8px">Highlights</div>${list(clips)}`)
  }

  parts.push(`<p style="margin:18px 0 0;color:#7A838F;font-size:14px">${
    inSquad
      ? `Your squad's table updates itself — every pick graded from the final score, nobody grading their own.`
      : `You can start a squad: a group with its own room and its own table, so it settles who was right instead of arguing about it. <a href="${SITE_URL}/squads" style="color:#00C805">Start one</a>.`
  }</p>`)

  const textLines = [
    gradedWhileAway > 0
      ? `The scoreboard settled ${gradedWhileAway} of your picks since you were last here.`
      : '',
    ...headlines.map(h => `${h.title}\n${h.href}`),
    ...clips.map(c => `${c.title}\n${c.href}`),
    inSquad ? '' : `Start a squad: ${SITE_URL}/squads`,
  ].filter(Boolean)

  return {
    subject,
    html: emailShell({
      // Escaped here and not in `subject`: the subject line is a mail
      // header and takes plain text, while the heading is dropped
      // straight into HTML. Both come from a news headline, which is
      // somebody else's text.
      heading: esc(subject),
      body: parts.join(''),
      cta: { label: `Open ${SITE_NAME}`, href: `${SITE_URL}/feed` },
    }),
    text: `@${username}\n\n${textLines.join('\n\n')}\n\n${SITE_URL}/feed`,
  }
}
