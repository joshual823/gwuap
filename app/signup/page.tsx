'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { SITE_NAME } from '@/lib/brand'
import ThemeToggle from '@/components/ThemeToggle'
import GoogleButton from '@/components/GoogleButton'
import FoundingCount from '@/components/FoundingCount'
import LeaguePicker from '@/components/LeaguePicker'
import { MAX_PREFERRED } from '@/lib/preferences'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // The account exists by the time this shows, so the leagues step is a
  // save-or-skip rather than part of creating it. Someone who closes the
  // tab here has a working account with no preferences, which is the same
  // outcome as skipping.
  const [step, setStep] = useState<'account' | 'leagues'>('account')
  const [leagues, setLeagues] = useState<string[]>([])

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
            ? 'Password needs to be at least 8 characters.'
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

    setLoading(false)
    setStep('leagues')
  }

  async function saveLeagues(chosen: string[]) {
    setLoading(true)
    // A failure here isn't worth blocking on — the account is made and
    // no preference just means the default mix.
    if (chosen.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles')
          .update({ preferred_leagues: chosen })
          .eq('id', user.id)
      }
    }
    router.push('/feed')
    router.refresh()
  }

  if (step === 'leagues') {
    return (
      <div style={{ maxWidth: 360, margin: '48px auto' }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>What do you follow?</h1>
        <p style={{ color: 'var(--ink-dim)', marginBottom: 18 }}>
          Pick up to {MAX_PREFERRED} and your scores and headlines lead with them.
          You can change this any time.
        </p>

        <LeaguePicker value={leagues} onChange={setLeagues} disabled={loading} />

        <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={loading}
          onClick={() => saveLeagues(leagues)}>
          {loading ? 'Saving…' : leagues.length > 0 ? 'Done' : 'Continue'}
        </button>
        <button className="btn secondary" style={{ width: '100%', marginTop: 8 }} disabled={loading}
          onClick={() => saveLeagues([])}>
          Skip — show me everything
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>{SITE_NAME}</h1>
      <p style={{ color: 'var(--ink-dim)', marginBottom: 12 }}>Create an account and get in the conversation.</p>
      <FoundingCount />
      <GoogleButton />
      <div className="or-line"><span>or</span></div>

      <form onSubmit={handleSignup}>
        <input className="field" placeholder="Username" value={username}
          onChange={e => setUsername(e.target.value)} required autoCapitalize="none" />
        <p className="field-hint">3–20 characters. Letters, numbers and underscores.</p>
        <input className="field" placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required autoCapitalize="none" />
        <input className="field" placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={8} />
        <p className="field-hint">At least 8 characters. Length beats complexity — a few words you’ll remember is fine.</p>
        <div className="signup-theme">
          <ThemeToggle />
        </div>

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
