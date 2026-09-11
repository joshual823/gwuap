import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabaseServer'
import { pushPayload } from '@/lib/push'
import { SITE_URL } from '@/lib/brand'
import type { Notif, Pick } from '@/lib/digest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Older than this and it isn't news — stamped and skipped. */
const MAX_AGE_MINUTES = 60

/**
 * Pushes notifications to the browsers people installed.
 *
 * Notification rows are written by database triggers, so nothing in the
 * app sees them appear — a job has to come along and find the unsent
 * ones. Same shape as the email digest, and deliberately so: claim by
 * stamping `pushed_at` *before* sending, group per person, send once.
 *
 * A crash between claiming and sending loses one notification. Doing it
 * the other way round risks sending the same one repeatedly, and a phone
 * that buzzes four times for one reply gets its notifications turned off
 * for good.
 *
 * Runs on a schedule rather than on request. Latency is the cadence of
 * that schedule, which is honest: this is a scheduled push, not an
 * instant one, and making it instant needs a Supabase database webhook
 * pointed here.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    // Explicit rather than a silent no-op: a push system that quietly
    // sends nothing looks identical to one where nobody has subscribed.
    return Response.json({ error: 'VAPID keys are not configured' }, { status: 503 })
  }
  webpush.setVapidDetails(`${SITE_URL}`, publicKey, privateKey)

  const supabase = createAdminClient()
  const since = new Date(Date.now() - MAX_AGE_MINUTES * 60_000).toISOString()

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, outcome, post_id, actor:profiles!notifications_actor_id_fkey ( username )')
    .is('pushed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const pending = (rows ?? []) as unknown as Notif[]

  // Anything older than the window is never going to be sent; stamp it so
  // it stops being scanned every run.
  await supabase.from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .is('pushed_at', null).lt('created_at', since)

  if (pending.length === 0) {
    return Response.json({ ok: true, considered: 0, pushed: 0, noSubscription: 0, gone: 0 })
  }

  // Which picks the graded rows are about, in one query for the run.
  const pickIds = [...new Set(
    pending.filter(n => n.type === 'graded' && n.post_id).map(n => n.post_id),
  )] as string[]
  const picks = new Map<string, Pick>()
  if (pickIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts').select('id, tag, tag2, sentiment, bet_type, line').in('id', pickIds)
    for (const p of (posts ?? []) as Pick[]) picks.set(p.id, p)
  }

  const byUser = new Map<string, Notif[]>()
  for (const n of pending) {
    const list = byUser.get(n.user_id) ?? []
    list.push(n)
    byUser.set(n.user_id, list)
  }

  let pushed = 0, noSubscription = 0, optedOut = 0, gone = 0
  const errors: string[] = []

  for (const [userId, items] of byUser) {
    // Claimed first, whatever happens next.
    await supabase.from('notifications')
      .update({ pushed_at: new Date().toISOString() })
      .in('id', items.map(i => i.id))

    const { data: profile } = await supabase
      .from('profiles').select('push_enabled').eq('id', userId).maybeSingle()
    if (!profile || profile.push_enabled === false) { optedOut++; continue }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .is('failed_at', null)

    const targets = subs ?? []
    if (targets.length === 0) { noSubscription++; continue }

    const payload = pushPayload(items, picks)
    if (!payload) continue
    const body = JSON.stringify(payload)

    for (const sub of targets as { endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
        pushed++
      } catch (e: any) {
        const status = e?.statusCode
        // 404/410 mean the browser threw the subscription away — an
        // uninstall, or cleared site data. Marked, never deleted, so one
        // bad run can't empty the table.
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions')
            .update({ failed_at: new Date().toISOString() })
            .eq('endpoint', sub.endpoint)
          gone++
        } else {
          errors.push(`${status ?? 'err'}: ${String(e?.message ?? e).slice(0, 120)}`)
        }
      }
    }
  }

  return Response.json({
    ok: true,
    considered: pending.length,
    people: byUser.size,
    pushed, noSubscription, optedOut, gone,
    errors: errors.slice(0, 5),
  })
}
