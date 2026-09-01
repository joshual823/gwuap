'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ResetConfirmPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [ready, setReady] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // The reset link should have established a session on the way in. No
  // session means the link expired or was already used.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReady(!!data.user))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password needs to be at least 8 characters.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError('Could not set that password — try the link again.'); return }
    router.push('/feed')
  }

  if (ready === null) return <p style={{ marginTop: 48, color: 'var(--ink-dim)' }}>Checking your link…</p>
  if (!ready) {
    return (
      <div style={{ maxWidth: 360, margin: '48px auto' }}>
        <h1 className="display" style={{ fontSize: 24, marginBottom: 8 }}>That link has expired</h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 16 }}>
          Reset links are good for an hour and can only be used once.
        </p>
        <a href="/reset" className="btn">Send a new one</a>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto' }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>Set a new password</h1>
      <form onSubmit={submit}>
        <input className="field" placeholder="New password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus />
        <p className="field-hint">At least 8 characters.</p>
        {error && <p style={{ color: 'var(--bear)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
