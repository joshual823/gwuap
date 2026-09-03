'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { squareResize, MAX_SOURCE_BYTES } from '@/lib/image'
import LeaguePicker from '@/components/LeaguePicker'
import { cleanPreferences, MAX_PREFERRED } from '@/lib/preferences'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function EditProfile({ profile }: {
  profile: {
    id: string; username: string; display_name: string | null
    bio: string | null; avatar_url: string | null
    preferred_leagues?: string[] | null
  }
}) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [leagues, setLeagues] = useState<string[]>(cleanPreferences(profile.preferred_leagues))
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

    // Uploaded into a folder named after the user id — storage policy
    // only permits writes there, so nobody can overwrite someone else's.
    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      if (!avatarFile.type.startsWith('image/')) {
        setError('That file isn\u2019t an image.'); setSaving(false); return
      }
      if (avatarFile.size > MAX_SOURCE_BYTES) {
        setError('That image is enormous — try one under 25MB.'); setSaving(false); return
      }

      // Shrink in the browser rather than asking people to do it. A phone
      // photo is several megabytes; this sends about fifty kilobytes.
      let resized: Blob
      try {
        resized = await squareResize(avatarFile)
      } catch {
        setError('Couldn\u2019t read that image. Try a JPEG or PNG.')
        setSaving(false); return
      }

      const path = `${profile.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) { setError('Could not upload that picture — try again.'); setSaving(false); return }
      avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: nextName,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        // Empty means no preference, which is the default mix rather than
        // an empty feed — so clearing every league is a valid choice.
        preferred_leagues: leagues.length > 0 ? leagues : null,
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
      <label className="form-label">Profile picture</label>
      <input type="file" accept="image/*" className="field"
        onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
      <p className="field-hint">Any size — it gets cropped square and shrunk for you.</p>

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

      <label className="form-label">Sports you follow</label>
      <p className="field-hint">
        Up to {MAX_PREFERRED}. Your scores and headlines lead with these.
        Choose none and you get a bit of everything.
      </p>
      <LeaguePicker value={leagues} onChange={setLeagues} disabled={saving} />

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
