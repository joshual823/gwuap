'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

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

    if (!USERNAME_RE.test(username)) {
      setError('Usernames are 3–20 characters, letters, numbers and underscores only.')
      return
    }

    setLoading(true)

    // Check the username BEFORE creating the account. Creating the auth
    // user first and failing on the profile insert leaves an account with
    // no profile — and because the email is now registered, retrying with
    // a different username fails with "User already registered". That
    // email would be permanently unusable.
    const { data: taken, error: lookupError } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle()

    if (lookupError) {
      setError('Could not reach the server — check your connection and try again.')
      setLoading(false)
      return
    }
    if (taken) {
      setError('That username is taken — try another.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      const msg = signUpError?.message ?? ''
      setError(
        /already registered|already exists/i.test(msg)
          ? 'There is already an account with that email. Try logging in instead.'
          : /password/i.test(msg)
            ? 'Password needs to be at least 6 characters.'
            : 'Something went wrong creating your account. Try again in a moment.',
      )
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username, display_name: username })

    if (profileError) {
      // Someone claimed the name in the gap between the check and the
      // insert. Sign back out so the half-made account can't strand them.
      await supabase.auth.signOut()
      setError('That username was just taken — pick another and try again.')
      setLoading(false)
      return
    }

    router.push('/feed')
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Gwuap</h1>
      <p style={{ color: 'var(--ink-dim)', marginBottom: 24 }}>Create your account and start posting your picks.</p>
      <form onSubmit={handleSignup}>
        <input className="field" placeholder="Username" value={username}
          onChange={e => setUsername(e.target.value)} required autoCapitalize="none" />
        <p className="field-hint">3–20 characters. Letters, numbers and underscores.</p>
        <input className="field" placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required autoCapitalize="none" />
        <input className="field" placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={6} />
        <p className="field-hint">At least 6 characters.</p>
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
