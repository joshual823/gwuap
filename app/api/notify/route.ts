import { createAdminClient } from '@/lib/supabaseServer'
import { sendEmail, emailShell } from '@/lib/email'
import { SITE_NAME, SITE_URL } from '@/lib/brand'
import { renderDigest, type Notif, type Pick } from '@/lib/digest'
import { renderNudge, nudgeDue, MAX_NUDGES } from '@/lib/nudge'
import { renderFirstPost, firstPostDue, MAX_FIRST_POST_NUDGES } from '@/lib/firstPost'
import { fetchNewsMixed } from '@/lib/news'
import { fetchClips } from '@/lib/clips'

export const dynamic = 'force-dynamic'

/**
 * Emails people that something happened.
 *
 * One digest per person per run rather than a message per event: three
 * reactions and a comment is one email, which is the difference between
 * a useful service and a reason to unsubscribe.
 *
 * Rows are claimed by stamping emailed_at before the send, so two
 * overlapping runs can't send the same thing twice. The cost of that
 * ordering is that a send which fails after the stamp is lost rather
 * than retried — the right way round, because a missed notification is a
 * smaller harm than the same email four times.
 */

/** Older than this and it isn't news any more. */
const MAX_AGE_HOURS = 72

/**
 * Resend rate-limits by the second, and the first run fired six sends
 * inside 300ms and lost all of them. Spacing costs nothing here: this
 * job has a whole hour and a handful of recipients.
 */
const GAP_MS = 700
const pause = () => new Promise(r => setTimeout(r, GAP_MS))

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured' }, { status: 503 })
  }
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return Response.json({ error: 'RESEND_API_KEY is not set in this environment' }, { status: 503 })
  }

  /**
   * Enough about the key to tell a wrong value from a rejected one,
   * and nothing that could reconstruct it. Two 401s in a row look
   * identical from the outside: a key that isn't a key, and a key the
   * service has revoked. This separates them.
   */
  const keyShape = {
    prefix: resendKey.slice(0, 3),
    length: resendKey.length,
    // Pasting from a dashboard picks these up more often than anyone expects.
    hasWhitespace: /\s/.test(resendKey),
  }

  const supabase = createAdminClient()
  const since = new Date(Date.now() - MAX_AGE_HOURS * 3600_000).toISOString()

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, outcome, post_id, actor:profiles!notifications_actor_id_fkey ( username )')
    .is('emailed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const pending = (rows ?? []) as unknown as Notif[]

  // The picks these notifications are about, in one query for the whole
  // run. Separate from the select above on purpose: that one decides
  // whether anything is sent at all, and it shouldn't start failing
  // because a column was added here.
  const pickIds = [...new Set(
    pending.filter(n => n.type === 'graded' && n.post_id).map(n => n.post_id),
  )] as string[]
  const picks = new Map<string, Pick>()
  if (pickIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts').select('id, tag, tag2, sentiment, bet_type, line').in('id', pickIds)
    for (const p of (posts ?? []) as Pick[]) picks.set(p.id, p)
  }

  // Anything older than the window is never going to be sent; stamp it so
  // it stops being scanned on every run.
  await supabase.from('notifications')
    .update({ emailed_at: new Date().toISOString() })
    .is('emailed_at', null).lt('created_at', since)

  const byUser = new Map<string, Notif[]>()
  for (const n of pending) {
    const list = byUser.get(n.user_id) ?? []
    list.push(n)
    byUser.set(n.user_id, list)
  }

  let sent = 0, skipped = 0, failed = 0
  const errors: string[] = []

  for (const [userId, items] of byUser) {
    const ids = items.map(i => i.id)
    // Claimed first, whatever happens next.
    await supabase.from('notifications')
      .update({ emailed_at: new Date().toISOString() }).in('id', ids)

    const { data: profile } = await supabase
      .from('profiles').select('username, email_notifications').eq('id', userId).maybeSingle()
    if (!profile || profile.email_notifications === false) { skipped++; continue }

    const { data: found } = await supabase.auth.admin.getUserById(userId)
    const to = found?.user?.email
    if (!to) { skipped++; continue }

    const digest = renderDigest(items, picks)
    const result = await sendEmail({
      to,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    })
    if (result.ok) {
      sent++
    } else {
      failed++
      if (!errors.includes(result.error)) errors.push(result.error)
      // Hand the claim back. A duplicate on a later run is a smaller
      // harm than a notification nobody ever receives.
      await supabase.from('notifications')
        .update({ emailed_at: null }).in('id', ids)
    }
    await pause()
  }

  // ---- welcome, once ------------------------------------------
  const { data: fresh } = await supabase
    .from('profiles')
    .select('id, username')
    .is('welcomed_at', null)
    .limit(20)

  let welcomed = 0
  for (const p of fresh ?? []) {
    const { data: found } = await supabase.auth.admin.getUserById(p.id)
    const to = found?.user?.email
    // No address, no welcome, and no stamp — if one appears later this
    // will find them again.
    if (!to) continue

    const result = await sendEmail({
      to,
      subject: `Welcome to ${SITE_NAME}, @${p.username}`,
      html: emailShell({
        heading: `You're in, @${p.username}`,
        body: `
          <p style="margin:0 0 12px"><strong>Post your first pick or take today.</strong></p>
          <p style="margin:0 0 6px">A <strong>take</strong> is your opinion on a player
          or team. It never touches your record.</p>
          <p style="margin:0 0 12px">A <strong>pick</strong> is what you think the
          outcome of a game or match will be — and that one counts.</p>
          <p style="margin:0 0 12px">You never grade your own, and nothing can be
          edited after a game starts. That's the whole idea.</p>
          <p style="margin:0 0 12px">Two things worth knowing on day one:
          picks have to be in within five minutes of the start to count, and
          five settled picks puts you on the leaderboard.</p>
          <p style="margin:0">Free, and it stays free — no deposit, no card,
          nothing at stake but your record.</p>`,
        /* The guided version, not the bare form: this is the one email
           that reaches somebody who has never seen the composer, and it
           opens the same walkthrough the welcome card does. */
        cta: { label: 'Show me how', href: `${SITE_URL}/post/new?tour=1` },
      }),
      text: `You're in, @${p.username}.\n\nPost your first pick or take today. A take is your opinion on a player or team and never touches your record. A pick is what you think the outcome of a game or match will be, and that one counts. Picks count if they're in within five minutes of the start, and five settled picks puts you on the leaderboard.\n\n${SITE_URL}/post/new?tour=1`,
    })
    if (result.ok) {
      welcomed++
      // Stamped only once it has actually gone. The first version marked
      // it first and every account on the site was recorded as welcomed
      // while the sends were failing — a greeting you only get once is
      // exactly the wrong thing to claim before delivering.
      await supabase.from('profiles')
        .update({ welcomed_at: new Date().toISOString() }).eq('id', p.id)
    } else {
      failed++
      if (!errors.includes(result.error)) errors.push(result.error)
    }
    await pause()
  }

  // ---- first post, for accounts that never started -------------
  //
  // A different silence from the one below. That one reads off
  // last_seen_at and means "you haven't been here"; this one means "you
  // have never posted", which is just as true of somebody who reads the
  // feed every morning. Day 3, then weekly for three more, then it
  // stops. See lib/firstPost.ts.
  let firstPosted = 0
  const { data: quiet } = await supabase
    .from('profiles')
    .select('id, username, created_at, first_post_nudge_count, email_notifications')
    .lt('first_post_nudge_count', MAX_FIRST_POST_NUDGES)
    .eq('is_bot', false)
    .order('created_at', { ascending: true })
    .limit(200)

  const dueForFirst = (quiet ?? []).filter((p: any) => {
    if (p.email_notifications === false) return false
    const days = (Date.now() - Date.parse(p.created_at)) / 86_400_000
    return firstPostDue(days, p.first_post_nudge_count ?? 0)
  })

  /**
   * Which of them have in fact posted — one query for the batch rather
   * than a count each. Anybody here is done: the campaign ends the
   * moment somebody posts, and nothing has to be cleared for that to
   * happen.
   *
   * They keep matching the query above afterwards, because their
   * counter never reaches the cap, and are skipped every run. That is
   * cheap at this size and would want a `has_posted` column long before
   * it isn't.
   */
  const hasPosted = new Set<string>()
  if (dueForFirst.length > 0) {
    const { data: theirs } = await supabase
      .from('posts').select('author_id')
      .in('author_id', dueForFirst.map((p: any) => p.id))
    for (const row of theirs ?? []) hasPosted.add((row as any).author_id)
  }

  for (const p of dueForFirst as any[]) {
    if (hasPosted.has(p.id)) continue
    const { data: found } = await supabase.auth.admin.getUserById(p.id)
    const to = found?.user?.email
    if (!to) { skipped++; continue }

    const mail = renderFirstPost({
      username: p.username,
      sent: p.first_post_nudge_count ?? 0,
    })
    const result = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text })
    if (result.ok) {
      firstPosted++
      // Stamped only once it has gone, same as the welcome and the
      // come-back: a counter that runs ahead of the sending silently
      // burns somebody's remaining emails.
      await supabase.from('profiles')
        .update({
          first_post_nudged_at: new Date().toISOString(),
          first_post_nudge_count: (p.first_post_nudge_count ?? 0) + 1,
        })
        .eq('id', p.id)
    } else {
      failed++
      if (!errors.includes(result.error)) errors.push(result.error)
    }
    await pause()
  }

  // ---- come back, for people who've drifted off ----------------
  //
  // Day 3, day 10, day 30, then it stops. Not daily: somebody who
  // hasn't been back in three days didn't stop for want of reminding,
  // and a mail a day is how a young sending domain earns a spam
  // reputation it can't undo. See lib/nudge.ts.
  let nudged = 0
  const { data: away } = await supabase
    .from('profiles')
    .select('id, username, last_seen_at, nudge_count, first_post_nudge_count, email_notifications')
    .lt('nudge_count', MAX_NUDGES)
    .not('last_seen_at', 'is', null)
    .eq('is_bot', false)
    .order('last_seen_at', { ascending: true })
    .limit(50)

  const dueToComeBack = (away ?? []).filter((p: any) => {
    if (p.email_notifications === false) return false
    const days = (Date.now() - Date.parse(p.last_seen_at)) / 86_400_000
    return nudgeDue(days, p.nudge_count ?? 0)
  })

  /**
   * One campaign at a time per person.
   *
   * Somebody who signed up last week, never posted and hasn't been back
   * qualifies for both of these, and would get two emails on overlapping
   * schedules — from the same domain, about the same site, days apart.
   * The first-post one is the better fit for them, so while it is still
   * running the come-back one stands down.
   *
   * It stands down rather than being cancelled: once those four are
   * spent, an account that still hasn't posted becomes an ordinary
   * lapsed member and the come-back schedule picks it up.
   */
  const stillBeingAsked = (dueToComeBack as any[])
    .filter(p => (p.first_post_nudge_count ?? 0) < MAX_FIRST_POST_NUDGES)
    .map(p => p.id)
  const everPosted = new Set<string>()
  if (stillBeingAsked.length > 0) {
    const { data: theirs } = await supabase
      .from('posts').select('author_id').in('author_id', stillBeingAsked)
    for (const row of theirs ?? []) everPosted.add((row as any).author_id)
  }
  const candidates = (dueToComeBack as any[]).filter(p =>
    (p.first_post_nudge_count ?? 0) >= MAX_FIRST_POST_NUDGES || everPosted.has(p.id))

  if (candidates.length > 0) {
    // Fetched once for everybody rather than per recipient — the news and
    // the highlights are the same whoever is reading them.
    const [headlines, clips] = await Promise.all([
      fetchNewsMixed(['Top'], 3).catch(() => []),
      fetchClips([], { limit: 3, perLeague: 1 }).catch(() => []),
    ])

    for (const p of candidates as any[]) {
      const { data: found } = await supabase.auth.admin.getUserById(p.id)
      const to = found?.user?.email
      if (!to) { skipped++; continue }

      // What they missed about themselves, which is the only part of
      // this email that's actually about them.
      const { count: graded } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', p.id)
        .in('status', ['win', 'loss', 'push'])
        .gte('graded_at', p.last_seen_at)

      const { count: squads } = await supabase
        .from('squad_members')
        .select('squad_id', { count: 'exact', head: true })
        .eq('user_id', p.id)

      const mail = renderNudge({
        username: p.username,
        sent: p.nudge_count ?? 0,
        headlines: headlines.slice(0, 3)
          .map(h => ({ title: h.title, href: h.link, detail: h.source })),
        clips: clips.map(c => ({ title: c.title, href: `${SITE_URL}/clips/${c.id}`, detail: c.league })),
        gradedWhileAway: graded ?? 0,
        inSquad: (squads ?? 0) > 0,
      })

      const result = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text })
      if (result.ok) {
        nudged++
        // Stamped only once it has gone, same as the welcome: a count
        // that runs ahead of the sending means somebody silently never
        // hears from us again.
        await supabase.from('profiles')
          .update({ nudged_at: new Date().toISOString(), nudge_count: (p.nudge_count ?? 0) + 1 })
          .eq('id', p.id)
      } else {
        failed++
        if (!errors.includes(result.error)) errors.push(result.error)
      }
      await pause()
    }
  }

  return Response.json({
    digests: sent, welcomed, firstPost: firstPosted, nudged, skipped, failed,
    considered: pending.length,
    // Named, so a failing run says why instead of just counting.
    errors: errors.slice(0, 3),
    // Only shown when something failed, and never the key itself.
    ...(failed > 0 ? { keyShape } : {}),
  })
}
