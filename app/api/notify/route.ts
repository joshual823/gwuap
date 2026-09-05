import { createAdminClient } from '@/lib/supabaseServer'
import { sendEmail, emailShell } from '@/lib/email'
import { SITE_NAME, SITE_URL } from '@/lib/brand'

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

type Notif = {
  id: string
  user_id: string
  type: string
  outcome: string | null
  post_id: string | null
  actor: { username: string } | null
}

function line(n: Notif): string {
  const who = n.actor?.username ? `@${n.actor.username}` : 'Someone'
  switch (n.type) {
    case 'graded':
      return n.outcome === 'win' ? 'Your pick <b>won</b>.'
        : n.outcome === 'loss' ? 'Your pick <b>lost</b>.'
        : n.outcome === 'push' ? 'Your pick <b>pushed</b>.'
        : 'Your pick was settled.'
    case 'reaction': return `${who} reacted to your post.`
    case 'comment':  return `${who} commented on your post.`
    case 'reply':    return `${who} replied to you.`
    case 'follow':   return `${who} followed you.`
    case 'repost':   return `${who} reposted your pick.`
    case 'dm_request': return `${who} wants to message you.`
    case 'dm_message': return `${who} sent you a message.`
    default: return `${who} did something.`
  }
}

function subjectFor(items: Notif[]): string {
  if (items.length === 1) {
    const only = items[0]
    if (only.type === 'graded') {
      return only.outcome === 'win' ? `Your pick won` : `Your pick was graded`
    }
    return line(only).replace(/<\/?b>/g, '').replace(/\.$/, '')
  }
  const graded = items.filter(i => i.type === 'graded').length
  if (graded === items.length) return `${graded} of your picks were graded`
  return `${items.length} new notifications on ${SITE_NAME}`
}

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

    const body = items.slice(0, 8).map(i => `<div style="margin:6px 0">${line(i)}</div>`).join('')
    const more = items.length > 8 ? `<div style="margin:6px 0;color:#7A838F">…and ${items.length - 8} more.</div>` : ''
    const href = items.length === 1 && items[0].post_id
      ? `${SITE_URL}/post/${items[0].post_id}`
      : `${SITE_URL}/notifications`

    const result = await sendEmail({
      to,
      subject: subjectFor(items),
      html: emailShell({
        heading: subjectFor(items),
        body: body + more,
        cta: { label: 'Open Gwuap', href },
      }),
      text: items.map(i => line(i).replace(/<\/?b>/g, '')).join('\n') + `\n\n${href}`,
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
          <p style="margin:0 0 12px">Post a pick and the final score settles it — you
          never grade your own, and nobody can edit a record after the fact. That's
          the whole idea.</p>
          <p style="margin:0 0 12px">Two things worth knowing on day one:
          picks have to be in within five minutes of the start to count, and
          five settled picks puts you on the leaderboard.</p>
          <p style="margin:0">There's a $300 prize for the best records in the
          launch contest. Free to enter — no deposit, nothing at stake but your
          record.</p>`,
        cta: { label: 'Post your first pick', href: `${SITE_URL}/post/new` },
      }),
      text: `You're in, @${p.username}.\n\nPost a pick and the final score settles it. Picks count if they're in within five minutes of the start, and five settled picks puts you on the leaderboard.\n\n${SITE_URL}/post/new`,
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

  return Response.json({
    digests: sent, welcomed, skipped, failed,
    considered: pending.length,
    // Named, so a failing run says why instead of just counting.
    errors: errors.slice(0, 3),
    // Only shown when something failed, and never the key itself.
    ...(failed > 0 ? { keyShape } : {}),
  })
}
