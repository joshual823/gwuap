'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Something went wrong creating your account.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username, display_name: username })

    if (profileError) {
      setError('That username is taken — try another.')
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Gwuap</h1>
      <p style={{ color: 'var(--ink-dim)', marginBottom: 24 }}>Create your account and start posting your picks.</p>
      <form onSubmit={handleSignup}>
        <input className="field" placeholder="Username" value={username}
          onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" />
        <input className="field" placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input className="field" placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={6} />
        {error && <p style={{ color: 'var(--bear)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-dim)' }}>
        Already have an account? <a href="/login" style={{ color: 'var(--twitter-blue)' }}>Log in</a>
      </p>
    </div>
  )
}
