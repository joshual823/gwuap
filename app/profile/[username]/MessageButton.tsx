'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { orderedPair } from '@/lib/dm'

export default function MessageButton({ profileId, username }: {
  profileId: string
  username: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true); setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const pair = orderedPair(user.id, profileId)

    // Already talking? Just go there rather than failing the unique index.
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('user_a', pair.user_a).eq('user_b', pair.user_b).maybeSingle()

    let conversationId = existing?.id as string | undefined

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({ ...pair, requested_by: user.id, status: 'pending' })
        .select('id')
        .single()
      if (createError || !created) {
        setBusy(false)
        // The blocked and rate-limit messages come from a trigger and are
        // written to be shown as-is.
        setError(createError?.message ?? 'Could not start that conversation.')
        return
      }
      conversationId = created.id
    }

    const { error: sendError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    setBusy(false)
    if (sendError) { setError(sendError.message); return }

    router.push(`/messages/${conversationId}`)
  }

  if (!open) {
    return <button className="btn secondary" onClick={() => setOpen(true)}>Message</button>
  }

  return (
    <form onSubmit={start} className="edit-profile">
      <label className="form-label">Message @{username}</label>
      <textarea className="field" rows={3} maxLength={2000} autoFocus
        placeholder="They'll get a request they can accept or decline."
        value={body} onChange={e => setBody(e.target.value)} />
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={busy || !body.trim()}>
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <button className="btn secondary" type="button" onClick={() => { setOpen(false); setError(null) }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
