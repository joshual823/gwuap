'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function ClaimUsernameForm({ userId, suggested, next }: {
  userId: string
  suggested: string
  next: string
}) {
  const supabase = createClient()
  const [username, setUsername] = useState(suggested)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function claim(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = username.trim()
    if (!USERNAME_RE.test(name)) {
      setError('3–20 characters. Letters, numbers and underscores.')
      return
    }

    setSaving(true)
    const { data: taken, error: lookupError } = await supabase
      .from('profiles').select('id').ilike('username', name).maybeSingle()
    if (lookupError) { setError('Could not reach the server — try again.'); setSaving(false); return }
    if (taken) { setError('That username is taken — try another.'); setSaving(false); return }

    const { error: insertError } = await supabase
      .from('profiles').insert({ id: userId, username: name, display_name: name })
    setSaving(false)
    // The unique index is the real guard; two people can claim the same
    // name between the check above and this insert.
    if (insertError) { setError('That username was just taken — pick another.'); return }

    // A full load so the header and tab bar pick up the new profile.
    window.location.href = next
  }

  return (
    <form onSubmit={claim}>
      <input className="field" value={username} autoFocus
        autoCapitalize="none" autoCorrect="off" placeholder="username"
        onChange={e => setUsername(e.target.value)} required />
      <p className="field-hint">3–20 characters. Letters, numbers and underscores.</p>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <button className="btn" type="submit" disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Claiming…' : 'Claim it'}
      </button>
    </form>
  )
}
