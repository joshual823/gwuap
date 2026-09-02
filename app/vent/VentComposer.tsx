'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import MentionInput from '@/components/MentionInput'

const MAX = 1000

export default function VentComposer({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true); setError(null)
    const { error: sendError } = await supabase
      .from('vent_messages').insert({ author_id: userId, body: text })
    setBusy(false)
    if (sendError) { setError('Could not post that — try again.'); return }
    setBody('')
    router.refresh()
  }

  return (
    <form onSubmit={send} className="comment-form">
      <MentionInput rows={3} maxLength={MAX}
        placeholder="What's going on?"
        value={body} onChange={setBody} />
      <div className="comment-form-foot">
        <span className="comment-count-left">
          {MAX - body.length < 200 ? `${MAX - body.length} left` : ''}
        </span>
        <button className="btn" type="submit" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
    </form>
  )
}
