'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

/**
 * Sign in with Google.
 *
 * Comes back through /auth/callback, which sends anyone without a
 * username to claim one — Google supplies a name and an email, not a
 * handle, and a handle is what this site renders people as.
 *
 * **The error is shown, not swallowed.** This shipped awaiting
 * signInWithOAuth and discarding what it returned, so when the Google
 * provider turned out never to have been enabled in Supabase — it
 * answered `provider is not enabled` — the button did nothing at all.
 * No redirect, no message. A visitor off a paid ad clicks it, watches
 * nothing happen, and leaves, and nothing anywhere records that they
 * tried. Say so instead, and point at the email form that does work.
 */
export default function GoogleButton({ next }: { next?: string }) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true); setError(null)
    const target = new URL('/auth/callback', window.location.origin)
    if (next) target.searchParams.set('next', next)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target.toString() },
    })
    // On success the browser is already leaving for Google, so there is
    // nothing to reset — only the failure path gets this far.
    if (oauthError) {
      setBusy(false)
      setError('Google sign-in isn’t working right now. Use your email below.')
    }
  }

  return (
    <>
    <button type="button" className="btn secondary oauth-btn" onClick={start} disabled={busy}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"/>
        <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41 15.3 46 24 46z"/>
        <path fill="#FBBC05" d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.8l7.4-5.7z"/>
        <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.3 2 7.8 7 4.3 14.2l7.4 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"/>
      </svg>
      Continue with Google
    </button>
    {error && (
      <p role="alert" style={{ color: 'var(--bear)', fontSize: 13, margin: '8px 0 0' }}>
        {error}
      </p>
    )}
    </>
  )
}
