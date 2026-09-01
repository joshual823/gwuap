'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function ResetPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset/confirm`,
    })
    setLoading(false)
    // Always report success. Saying "no account with that email" would let
    // anyone test which addresses are registered here.
    setSent(true)
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 8 }}>Reset your password</h1>
      {sent ? (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.5 }}>
          If there's an account for <strong>{email}</strong>, a reset link is on its way.
          It expires in an hour. Check spam if it doesn't turn up.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--ink-dim)', marginBottom: 20, fontSize: 14 }}>
            Enter your email and we'll send you a link to set a new one.
          </p>
          <form onSubmit={submit}>
            <input className="field" placeholder="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoCapitalize="none" />
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-dim)' }}>
        <a href="/login" style={{ color: 'var(--twitter-blue)' }}>Back to log in</a>
      </p>
    </div>
  )
}
