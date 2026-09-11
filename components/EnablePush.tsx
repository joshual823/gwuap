'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

/**
 * Turns on push for this browser.
 *
 * Two people who signed up on 11 Sep went straight back to a Polymarket
 * group chat because they wanted an app with push notifications. This is
 * the button that answers that.
 *
 * **On iOS none of this exists until the app is on the home screen.**
 * Safari exposes no PushManager in a normal tab, so the component has to
 * tell an iPhone user to install first rather than show a button that
 * throws. Android and desktop can subscribe from anywhere.
 *
 * The subscription row is written straight from the browser — RLS on
 * `push_subscriptions` only lets somebody write their own, so there's no
 * API route in the middle to get wrong.
 */
type State = 'checking' | 'unsupported' | 'needs-install' | 'ready' | 'on' | 'denied' | 'working'

function urlBase64ToBytes(base64: string): ArrayBuffer {
  // VAPID keys are base64url; atob wants base64 with padding. Returned as
  // an ArrayBuffer because applicationServerKey wants one backed by a
  // plain ArrayBuffer, which a bare Uint8Array's type doesn't guarantee.
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

export default function EnablePush() {
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState<string | null>(null)
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!vapid) { setState('unsupported'); return }

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent)

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // On iOS this is the normal state in a browser tab, and the fix is
      // installing rather than switching browser — so say that instead of
      // "not supported", which sounds like a dead end.
      setState(isIos && !standalone ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') { setState('denied'); return }

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setState(sub ? 'on' : 'ready'))
      .catch(() => setState('unsupported'))
  }, [vapid])

  async function enable() {
    setError(null)
    setState('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'ready'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(vapid as string),
      })

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sign in first.'); setState('ready'); return }

      // Upsert on the endpoint: re-subscribing in the same browser must
      // update the row, not add a second one that buzzes the same phone
      // twice for one event.
      const { error: dbError } = await supabase.from('push_subscriptions').upsert({
        endpoint: json.endpoint,
        user_id: user.id,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: navigator.userAgent.slice(0, 300),
        failed_at: null,
      }, { onConflict: 'endpoint' })
      if (dbError) { setError('Could not save this device. Try again.'); setState('ready'); return }

      setState('on')
    } catch {
      setError('Your browser refused to turn them on.')
      setState('ready')
    }
  }

  if (state === 'checking' || state === 'unsupported') return null

  return (
    <div className="push-card">
      {state === 'on' ? (
        <p className="push-on">✓ Notifications are on for this device.</p>
      ) : state === 'needs-install' ? (
        <>
          <strong>Get notified</strong>
          <p>
            On iPhone, add Gwuap to your home screen first — tap Share, then
            “Add to Home Screen”. Notifications only work from there.
          </p>
        </>
      ) : state === 'denied' ? (
        <>
          <strong>Notifications are blocked</strong>
          <p>
            Your browser is set to block them for this site. Turn them back on
            in its settings and come back here.
          </p>
        </>
      ) : (
        <>
          <strong>Get notified</strong>
          <p>When someone replies, reacts, or one of your picks gets graded.</p>
          <button type="button" className="btn" onClick={enable} disabled={state === 'working'}>
            {state === 'working' ? 'Turning on…' : 'Turn on notifications'}
          </button>
          {error && <p className="push-error">{error}</p>}
        </>
      )}
    </div>
  )
}
