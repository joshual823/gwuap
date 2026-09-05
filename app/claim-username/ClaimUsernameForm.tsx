'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { trackSignUp } from '@/lib/rdt'
import { uploadAvatar } from '@/lib/uploadAvatar'
import Avatar from '@/components/Avatar'
import LeaguePicker from '@/components/LeaguePicker'
import { MAX_PREFERRED } from '@/lib/preferences'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

/**
 * The step where an account becomes real.
 *
 * Everything arrives here now — Google, and email signup since
 * confirmation was turned on, because the profile can't be written until
 * the link is clicked. So this is the only place left to ask for the
 * things that make a profile look like a person's, rather than a row.
 *
 * Both extras are optional and neither blocks the button. Someone who
 * just wants in gets in; the picture is a nicety and the leagues only
 * reorder a feed that works fine without them.
 */
export default function ClaimUsernameForm({ userId, suggested, next }: {
  userId: string
  suggested: string
  next: string
}) {
  const supabase = createClient()
  const [username, setUsername] = useState(suggested)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function chooseFile(file: File | null) {
    setAvatarFile(file)
    setPreview(p => { if (p) URL.revokeObjectURL(p); return file ? URL.createObjectURL(file) : null })
  }

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

    // The picture is uploaded before the row exists, which is fine: the
    // storage policy keys on the user id, and that already exists.
    let avatarUrl: string | null = null
    if (avatarFile) {
      // A picture that won't upload is not a reason to lose the account.
      // The initials stand in and it can be set later from the profile.
      const result = await uploadAvatar(avatarFile)
      if (!('error' in result)) avatarUrl = result.url
    }

    const { error: insertError } = await supabase
      .from('profiles').insert({ id: userId, username: name, display_name: name })
    if (insertError) {
      setSaving(false)
      // The unique index is the real guard; two people can claim the same
      // name between the check above and this insert. Anything else says
      // what it was, rather than blaming a name that's perfectly free.
      setError(/duplicate|unique/i.test(insertError.message)
        ? 'That username was just taken — pick another.'
        : `Could not finish setting up — ${insertError.message}`)
      return
    }

    // The rest is an update, which 031 does grant for these columns. A
    // failure here isn't worth losing the account over — both are
    // optional and both are editable from the profile afterwards.
    if (avatarUrl || leagues.length > 0) {
      await supabase.from('profiles').update({
        avatar_url: avatarUrl,
        preferred_leagues: leagues.length > 0 ? leagues : null,
      }).eq('id', userId)
    }
    setSaving(false)

    // Counted here, where the account becomes real.
    trackSignUp()

    // A full load so the header and tab bar pick up the new profile.
    window.location.href = next
  }

  return (
    <form onSubmit={claim}>
      <input className="field" value={username} autoFocus
        autoCapitalize="none" autoCorrect="off" placeholder="username"
        onChange={e => setUsername(e.target.value)} required />
      <p className="field-hint">3–20 characters. Letters, numbers and underscores.</p>

      <label className="form-label" style={{ marginTop: 18 }}>Profile picture</label>
      <div className="claim-avatar">
        {/* The initials aren't a placeholder for a missing picture — they
            are what you get if you skip this, so show them as such. */}
        <Avatar url={preview} name={username || 'a'} size={56} />
        <div className="claim-avatar-side">
          <input type="file" accept="image/*" className="field" style={{ marginBottom: 4 }}
            onChange={e => chooseFile(e.target.files?.[0] ?? null)} />
          <p className="field-hint" style={{ margin: 0 }}>
            {avatarFile ? 'Looks good.' : 'Optional. Nothing inappropriate.'}
          </p>
        </div>
      </div>

      <label className="form-label" style={{ marginTop: 18 }}>Sports you follow</label>
      <p className="field-hint">
        Up to {MAX_PREFERRED}. Your scores and headlines lead with these.
        Choose none and you get a bit of everything.
      </p>
      <LeaguePicker value={leagues} onChange={setLeagues} disabled={saving} />

      {error && <p style={{ color: 'var(--bear)', fontSize: 13, margin: '14px 0 10px' }}>{error}</p>}
      <button className="btn" type="submit" disabled={saving}
        style={{ width: '100%', marginTop: 18 }}>
        {saving ? 'Setting up…' : 'Finish'}
      </button>
    </form>
  )
}
