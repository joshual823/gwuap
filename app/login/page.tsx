'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  // One field for either. People remember the name they picked far more
  // often than the address they signed up with.
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Honour ?next= so a gated page sends you back where you were going.
    // Read from the URL directly rather than useSearchParams, which would
    // need a Suspense boundary around this whole page.
    const nextParam = new URLSearchParams(window.location.search).get('next')
    const next = nextParam && nextParam.startsWith('/') ? nextParam : '/feed'
    const id = identifier.trim()

    // An address can sign in from here directly. A username can't — the
    // email it belongs to is only readable on the server — so that goes
    // through a route that resolves it and establishes the session there.
    if (id.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: id, password })
      setLoading(false)
      if (error) { setError('Wrong email or password.'); return }
      router.push(next)
      // The root layout is client-cached, so without this the header and
      // tab bar keep rendering the logged-out state for ~30 seconds.
      router.refresh()
      return
    }

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, password }),
    })
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Wrong username or password.')
      return
    }
    // A full load rather than a client navigation: the session was
    // written as cookies by the server, and this is what guarantees the
    // browser picks them up.
    window.location.href = next
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 24 }}>Welcome back</h1>
      <form onSubmit={handleLogin}>
        <input className="field" placeholder="Username or email" type="text"
          autoCapitalize="none" autoCorrect="off" autoComplete="username"
          value={identifier} onChange={e => setIdentifier(e.target.value)} required />
        <input className="field" placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: 'var(--bear)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-dim)' }}>
        <a href="/reset" style={{ color: 'var(--twitter-blue)' }}>Forgot your password?</a>
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-dim)' }}>
        New here? <a href="/signup" style={{ color: 'var(--twitter-blue)' }}>Create an account</a>
      </p>
    </div>
  )
}
