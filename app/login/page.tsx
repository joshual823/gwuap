'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('Wrong email or password.'); return }
    // Honour ?next= so a gated page sends you back where you were going.
    // Read from the URL directly rather than useSearchParams, which would
    // need a Suspense boundary around this whole page.
    const next = new URLSearchParams(window.location.search).get('next')
    router.push(next && next.startsWith('/') ? next : '/feed')
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 24 }}>Welcome back</h1>
      <form onSubmit={handleLogin}>
        <input className="field" placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required />
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
