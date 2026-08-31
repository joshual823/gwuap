'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

const MAX_LENGTH = 500

export default function CommentForm({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!signedIn) {
    return (
      <p className="comment-signin">
        <Link href="/login" className="comment-signin-link">Log in</Link> to join the conversation.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: insertError } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, body: trimmed })

    setLoading(false)
    if (insertError) { setError('Could not post that comment — try again.'); return }
    setBody('')
    router.refresh()
  }

  const remaining = MAX_LENGTH - body.length

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        className="field"
        rows={2}
        maxLength={MAX_LENGTH}
        placeholder="Add a comment…"
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <div className="comment-form-foot">
        <span className={`comment-count-left ${remaining < 50 ? 'low' : ''}`}>
          {remaining < 100 ? `${remaining} left` : ''}
        </span>
        <button className="btn" type="submit" disabled={loading || !body.trim()}>
          {loading ? 'Posting…' : 'Reply'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
    </form>
  )
}
