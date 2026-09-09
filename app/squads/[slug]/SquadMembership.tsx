'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/**
 * Join, or leave.
 *
 * The owner can't leave their own squad — somebody has to be able to
 * clear the room, and a squad whose owner has walked out has nobody who
 * can. Handing ownership on is the right answer to that and isn't built
 * yet, so for now the button says why instead of failing.
 */
export default function SquadMembership({ squadId, userId, isMember, isOwner }: {
  squadId: string
  userId: string
  isMember: boolean
  isOwner: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setBusy(true); setError(null)
    const supabase = createClient()
    const { error: err } = isMember
      ? await supabase.from('squad_members').delete()
          .match({ squad_id: squadId, user_id: userId })
      : await supabase.from('squad_members').insert({ squad_id: squadId, user_id: userId })
    setBusy(false)
    if (err) { setError(err.message); return }
    router.refresh()
  }

  if (isOwner) {
    return <span className="squad-badge" title="Owners can't leave their own squad yet">Owner</span>
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button className={`btn ${isMember ? 'secondary' : ''}`} onClick={toggle} disabled={busy}>
        {busy ? '…' : isMember ? 'Leave' : 'Join'}
      </button>
      {error && <span style={{ color: 'var(--bear)', fontSize: 12 }}>{error}</span>}
    </span>
  )
}
