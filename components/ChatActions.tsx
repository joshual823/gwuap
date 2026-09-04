'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

/**
 * Report or delete a single chat message.
 *
 * The same shape as the Vent room's actions, and deliberately so — the
 * two rooms should not teach different habits. No router.refresh() after
 * a delete, though: chat is subscribed to its own table, so the row
 * disappears for everyone in the room, including whoever removed it.
 */
export default function ChatActions({ messageId, authorId, viewerId }: {
  messageId: string
  authorId: string
  viewerId: string
}) {
  const supabase = createClient()
  const [mode, setMode] = useState<'idle' | 'confirm' | 'report' | 'reported'>('idle')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const mine = authorId === viewerId

  async function remove() {
    setBusy(true)
    await supabase.from('game_messages').delete().eq('id', messageId)
    setBusy(false)
  }

  async function report() {
    if (!reason.trim()) return
    setBusy(true)
    await supabase.from('reports').insert({
      reporter_id: viewerId,
      reported_user_id: authorId,
      reported_game_message_id: messageId,
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
