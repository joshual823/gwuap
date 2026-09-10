'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { isValidUsername } from '@/lib/username'
import ShareRow from '@/components/ShareRow'

/**
 * Bringing people in, two ways.
 *
 * By username, for somebody already here — which sends an invite, not an
 * enrolment. They get a notification and join themselves. Adding people
 * to group chats without asking is how group chats end up muted, and the
 * membership rules wouldn't allow it anyway.
 *
 * By link, for somebody who isn't here. The share targets are the places
 * people actually forward things to; the copy button is the one that
 * gets used when none of them is where the group lives.
 */
export default function SquadInvite({ squadId, squadName, userId, url }: {
  squadId: string
  squadName: string
  userId: string
  url: string
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const text = `Join ${squadName} on Gwuap`

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    const asked = name.trim().replace(/^@/, '')
    if (!isValidUsername(asked)) { setError('That isn’t a username.'); return }
    setBusy(true); setError(null); setNote(null)
    const supabase = createClient()

    const { data: profile } = await supabase
      .from('profiles').select('id, username').ilike('username', asked).maybeSingle()
    // ilike treats `_` as a wildcard and `_` is legal in a username, so
    // confirm the row is the one that was asked for — same as /api/login.
    if (!profile || profile.username.toLowerCase() !== asked.toLowerCase()) {
      setBusy(false); setError(`No account called @${asked}.`); return
    }
    if (profile.id === userId) { setBusy(false); setError('You’re already in it.'); return }

    const { error: err } = await supabase.from('squad_invites')
      .insert({ squad_id: squadId, inviter_id: userId, invitee_id: profile.id })
    setBusy(false)
    if (err) {
      setError(/duplicate|unique/i.test(err.message)
        ? `@${profile.username} has already been invited.`
        : err.message)
      return
    }
    setName('')
    setNote(`Invited @${profile.username}. They'll see it in their notifications.`)
  }

  return (
    <div className="squad-invite">
      <h2 className="rec-h2">Bring people in</h2>

      <form onSubmit={invite} className="squad-invite-form">
        <input className="field" value={name} placeholder="@username" maxLength={21}
          autoCapitalize="none" autoCorrect="off"
          onChange={e => { setName(e.target.value); setError(null); setNote(null) }} />
        <button className="btn" type="submit" disabled={busy || !name.trim()}>
          {busy ? '…' : 'Invite'}
        </button>
      </form>
      {note && <p className="squad-invite-ok">{note}</p>}
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}

      <ShareRow url={url} text={text} />
    </div>
  )
}
