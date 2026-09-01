'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function EditProfile({ profile }: {
  profile: { id: string; username: string; display_name: string | null; bio: string | null }
}) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const nextName = username.trim()
    if (!USERNAME_RE.test(nextName)) {
      setError('Usernames are 3–20 characters, letters, numbers and underscores only.')
      return
    }

    setSaving(true)

    // Only check availability if it actually changed, otherwise your own
    // row comes back and reads as "taken".
    if (nextName.toLowerCase() !== profile.username.toLowerCase()) {
      const { data: taken, error: lookupError } = await supabase
        .from('profiles').select('id').ilike('username', nextName).maybeSingle()
      if (lookupError) { setError('Could not reach the server — try again.'); setSaving(false); return }
      if (taken) { setError('That username is taken — try another.'); setSaving(false); return }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: nextName,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (updateError) {
      // The unique index is the real guard; someone can claim a name in
      // the gap between the check above and this write.
      setError(/duplicate|unique/i.test(updateError.message)
        ? 'That username was just taken — pick another.'
        : 'Could not save those changes — try again.')
      return
    }

    setOpen(false)
    // The URL contains the username, so a rename has to navigate.
    if (nextName !== profile.username) router.push(`/profile/${nextName}`)
    router.refresh()
  }

  if (!open) {
    return <button className="btn secondary" onClick={() => setOpen(true)}>Edit profile</button>
  }

  return (
    <form onSubmit={save} className="edit-profile">
      <label className="form-label">Username</label>
      <input className="field" value={username} autoCapitalize="none"
        onChange={e => setUsername(e.target.value)} required />
      <p className="field-hint">3–20 characters. Letters, numbers and underscores.</p>

      <label className="form-label">Display name</label>
      <input className="field" value={displayName} placeholder="Optional"
        onChange={e => setDisplayName(e.target.value)} maxLength={40} />

      <label className="form-label">Bio</label>
      <textarea className="field" rows={2} value={bio} placeholder="Optional"
        onChange={e => setBio(e.target.value)} maxLength={200} />

      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn secondary" type="button" onClick={() => { setOpen(false); setError(null) }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
