'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const MAX = 2000

export default function MessageComposer({ conversationId, disabled, placeholder }: {
  conversationId: string
  disabled?: string | null
  placeholder?: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (disabled) return <p className="dm-disabled">{disabled}</p>

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error: sendError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    setSending(false)
    if (sendError) { setError(sendError.message); return }
    setBody('')
    router.refresh()
  }

  return (
    <form onSubmit={send} className="comment-form">
      <textarea className="field" rows={2} maxLength={MAX}
        placeholder={placeholder ?? 'Write a message…'}
        value={body} onChange={e => setBody(e.target.value)} />
      <div className="comment-form-foot">
        <span className="comment-count-left">
          {MAX - body.length < 200 ? `${MAX - body.length} left` : ''}
        </span>
        <button className="btn" type="submit" disabled={sending || !body.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
    </form>
  )
}
