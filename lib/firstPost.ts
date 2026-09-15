import { SITE_NAME, SITE_URL } from './brand'
import { emailShell } from './email'

/**
 * The "you haven't posted yet" email.
 *
 * A different silence from the one `nudge.ts` handles. That one is about
 * absence and reads off `last_seen_at`; this one is about an account
 * that may well be reading every day and has never put anything up. The
 * come-back email would say the wrong thing to them entirely — they
 * haven't gone anywhere.
 *
 * Pure: an input, an email out. No network and no clock beyond what it's
 * given, so the wording is tested rather than discovered in an inbox.
 */

export type FirstPostInput = {
  username: string
  /** How many of these have already gone. Decides which one this is. */
  sent: number
}

/**
 * The schedule: day 3, then weekly for three more, then nothing.
 *
 * Josh asked for "a few days, then maybe once a week". This is that,
 * with an end on it. The end is not a hedge: unlimited weekly mail to
 * somebody who has ignored every previous one is precisely how a young
 * sending domain gets marked as spam, and the damage lands on the
 * confirmation links and the graded-pick notifications too — mail people
 * actually want. Four is enough to be sure they saw it and few enough to
 * still be a reminder rather than a campaign.
 *
 * Counted from `created_at`, because the question is "has this account
 * ever started", which has nothing to do with when they were last here.
 */
export const FIRST_POST_DAYS = [3, 10, 17, 24] as const
export const MAX_FIRST_POST_NUDGES = FIRST_POST_DAYS.length

/** Whether this account is due one, given how old it is. */
export function firstPostDue(daysOld: number, alreadySent: number): boolean {
  if (alreadySent >= MAX_FIRST_POST_NUDGES) return false
  const threshold = FIRST_POST_DAYS[alreadySent]
  return daysOld >= threshold
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * A different angle each time.
 *
 * Four identical emails is both a spam signal and an admission that
 * there was only ever one thing to say. Each of these leads with a
 * different reason, and the last one says it's the last — somebody who
 * isn't going to post deserves to know the mail stops rather than
 * having to guess or unsubscribe.
 */
const ANGLES = [
  {
    subject: `Post your first take, @{u}`,
    heading: `Your first one takes a minute`,
    lead: `<p style="margin:0 0 12px">You're in, but the feed doesn't know what you
      think yet. The quickest way to start is a <strong>take</strong> — a team or
      a player, and a sentence. No odds, no fixture, and it never touches your
      record.</p>
      <p style="margin:0 0 12px">A <strong>pick</strong> is the other kind: a call
      the final score settles, and that one counts.</p>`,
    textLead: `The quickest way to start is a take — a team or a player, and a sentence. No odds, and it never touches your record. A pick is the other kind: the final score settles it, and that one counts. Either works on a team or a player.`,
  },
  {
    subject: `Nobody grades their own, @{u}`,
    heading: `The whole point is the part you haven't used`,
    lead: `<p style="margin:0 0 12px">Anyone can say they were right last week.
      Here the scoreboard settles it, nothing can be edited once a game starts,
      and every post is timestamped — which is why a record on this site means
      something.</p>
      <p style="margin:0 0 12px">None of that does anything until you post once.
      Start with a take if a pick feels like commitment.</p>`,
    textLead: `Anyone can say they were right last week. Here the scoreboard settles it, nothing can be edited once a game starts, and every post is timestamped. None of that does anything until you post once.`,
  },
  {
    subject: `Still nothing on your record, @{u}`,
    heading: `Five settled picks puts you on the leaderboard`,
    lead: `<p style="margin:0 0 12px">Your record is empty, which is a fair
      reflection of nothing having been posted yet. Five settled picks is all it
      takes to appear on the leaderboard.</p>
      <p style="margin:0 0 12px">Or post a take and skip the record entirely —
      it's an opinion with a cashtag on it — a team or a player — and it shows
      up on their page.</p>`,
    textLead: `Your record is empty. Five settled picks puts you on the leaderboard. Or post a take and skip the record entirely — an opinion with a cashtag on it.`,
  },
  {
    subject: `Last one from us, @{u}`,
    heading: `We'll stop asking after this`,
    lead: `<p style="margin:0 0 12px">This is the last reminder — the account stays,
      the feed stays, and we'll leave you to it.</p>
      <p style="margin:0 0 12px">If you ever do want to put something up, it's one
      team or player and one sentence, and there's a walkthrough that points at
      each field as you go.</p>`,
    textLead: `This is the last reminder. The account stays and we'll leave you to it. If you ever want to post, it's one team or player and one sentence, and there's a walkthrough.`,
  },
]

export function renderFirstPost(input: FirstPostInput): { subject: string; html: string; text: string } {
  const { username, sent } = input
  const angle = ANGLES[Math.min(sent, ANGLES.length - 1)]
  const subject = angle.subject.replace('{u}', username)

  /* Straight to the walkthrough, not to a bare form. The form has a
     league, a bet type and a cashtag on it, and the thing being asked
     for is a first post from somebody who has never made one — so the
     link lands on the guided version, the same one the welcome card
     opens. */
  const href = `${SITE_URL}/post/new?tour=1`

  const body = angle.lead + `<p style="margin:0;color:#7A838F;font-size:14px">
    Free, and it stays free — no deposit, no card, nothing at stake but your record.</p>`

  return {
    subject,
    html: emailShell({
      heading: esc(angle.heading),
      body,
      cta: { label: 'Show me how', href },
    }),
    text: `@${username}\n\n${angle.textLead}\n\n${href}`,
  }
}
