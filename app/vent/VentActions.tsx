'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function VentActions({ messageId, authorId, viewerId }: {
  messageId: string
  authorId: string
  viewerId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'confirm' | 'report' | 'reported'>('idle')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const mine = authorId === viewerId

  async function remove() {
    setBusy(true)
    await supabase.from('vent_messages').delete().eq('id', messageId)
    setBusy(false)
    router.refresh()
  }

  async function report() {
    if (!reason.trim()) return
    setBusy(true)
    await supabase.from('reports').insert({
      reporter_id: viewerId,
      reported_user_id: authorId,
      reported_vent_id: messageId,
      reason: reason.trim(),
    })
    setBusy(false)
    setMode('reported')
  }

  if (mode === 'reported') return <span className="vent-action-note">Reported. Thanks.</span>

  if (mode === 'confirm') {
    return (
      <span className="vent-actions">
        <button className="comment-del danger" onClick={remove} disabled={busy}>
          {busy ? 'Deleting…' : 'Really delete?'}
        </button>
        <button className="comment-del" onClick={() => setMode('idle')}>Cancel</button>
      </span>
    )
  }

  if (mode === 'report') {
    return (
      <span className="vent-actions">
        <input className="field" style={{ margin: 0, maxWidth: 200 }} autoFocus
          placeholder="What's wrong with it?" value={reason}
          onChange={e => setReason(e.target.value)} />
        <button className="comment-del" onClick={report} disabled={busy || !reason.trim()}>Send</button>
        <button className="comment-del" onClick={() => setMode('idle')}>Cancel</button>
      </span>
    )
  }

  return (
    <span className="vent-actions">
      {mine
        ? <button className="comment-del danger" onClick={() => setMode('confirm')}>Delete</button>
        : <button className="comment-del" onClick={() => setMode('report')}>Report</button>}
    </span>
  )
}
