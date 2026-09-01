'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function RequestActions({ conversationId, fromUsername }: {
  conversationId: string
  fromUsername: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function respond(status: 'accepted' | 'declined') {
    setBusy(true); setError(null)
    const { error: updateError } = await supabase
      .from('conversations').update({ status }).eq('id', conversationId)
    setBusy(false)
    if (updateError) { setError('Could not do that — try again.'); return }
    if (status === 'declined') router.push('/messages')
    router.refresh()
  }

  return (
    <div className="dm-request">
      <p><strong>@{fromUsername}</strong> wants to message you.</p>
      <p className="dm-request-note">
        They can't send anything else until you accept. Declining leaves the
        conversation closed — they aren't told.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={busy} onClick={() => respond('accepted')}>Accept</button>
        <button className="btn secondary" disabled={busy} onClick={() => respond('declined')}>Decline</button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
    </div>
  )
}
