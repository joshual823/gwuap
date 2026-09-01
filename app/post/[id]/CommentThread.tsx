'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { tallyReactions } from '@/lib/reactions'
import { timeAgo } from '@/lib/time'
import ReactionBar from '@/components/ReactionBar'
import DeleteComment from './DeleteComment'

const MAX_LENGTH = 500

export type CommentRow = {
  id: string
  body: string
  created_at: string
  parent_id: string | null
  author: { id: string; username: string } | null
  comment_reactions: { user_id: string; emoji: string | null }[]
}

export default function CommentThread({
  postId, viewerId, comments,
}: {
  postId: string
  viewerId: string | null
  comments: CommentRow[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  // Threading is one level deep. A reply to a reply attaches to the same
  // top-level parent and @-mentions the person instead — unlimited
  // nesting is unreadable in a 460px column.
  const { topLevel, repliesByParent } = useMemo(() => {
    const top: CommentRow[] = []
    const byParent = new Map<string, CommentRow[]>()
    for (const c of comments) {
      if (!c.parent_id) { top.push(c); continue }
      const list = byParent.get(c.parent_id) ?? []
      list.push(c)
      byParent.set(c.parent_id, list)
    }
    return { topLevel: top, repliesByParent: byParent }
  }, [comments])

  function startReply(c: CommentRow) {
    const username = c.author?.username ?? 'user'
    setReplyTo({ id: c.parent_id ?? c.id, username })
    setBody(prev => (prev.trim() ? prev : `@${username} `))
    requestAnimationFrame(() => boxRef.current?.focus())
  }

  function cancelReply() {
    setReplyTo(null)
    setBody(prev => (prev.trim().startsWith('@') ? '' : prev))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    if (!viewerId) { router.push('/login'); return }

    setLoading(true)
    setError(null)
    const { error: insertError } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: viewerId,
      body: trimmed,
      parent_id: replyTo?.id ?? null,
    })
    setLoading(false)
    if (insertError) { setError('Could not post that comment — try again.'); return }
    setBody('')
    setReplyTo(null)
    router.refresh()
  }

  function renderComment(c: CommentRow, isReply: boolean) {
    const rows = c.comment_reactions ?? []
    return (
      <article className={`comment ${isReply ? 'is-reply' : ''}`} key={c.id}>
        <Link href={`/profile/${c.author?.username}`}>
          <div className="avatar comment-avatar" />
        </Link>
        <div className="comment-body">
          <div className="comment-head">
            <Link href={`/profile/${c.author?.username}`} className="uname">@{c.author?.username}</Link>
            <span className="dot">·</span>
            <span className="time">{timeAgo(c.created_at)}</span>
            {viewerId === c.author?.id && <DeleteComment commentId={c.id} />}
          </div>
          <p className="comment-text">{c.body}</p>
          <div className="comment-actions">
            <ReactionBar
              targetKind="comment"
              targetId={c.id}
              initialCounts={tallyReactions(rows)}
              initialMine={rows.find(r => r.user_id === viewerId)?.emoji ?? null}
              viewerId={viewerId}
              compact
            />
            <button type="button" className="reply-btn" onClick={() => startReply(c)}>Reply</button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <>
      <h2 className="comments-heading">
        {comments.length === 0
          ? 'No replies yet'
          : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`}
      </h2>

      {topLevel.map(c => (
        <div key={c.id}>
          {renderComment(c, false)}
          {(repliesByParent.get(c.id) ?? []).map(r => renderComment(r, true))}
        </div>
      ))}

      {!viewerId ? (
        <p className="comment-signin">
          <Link href="/login" className="comment-signin-link">Log in</Link> to join the conversation.
        </p>
      ) : (
        <form onSubmit={submit} className="comment-form">
          {replyTo && (
            <div className="replying-chip">
              Replying to <strong>@{replyTo.username}</strong>
              <button type="button" onClick={cancelReply} aria-label="Cancel reply">✕</button>
            </div>
          )}
          <textarea
            ref={boxRef}
            className="field"
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder={replyTo ? `Reply to @${replyTo.username}…` : 'Add a comment…'}
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div className="comment-form-foot">
            <span className={`comment-count-left ${MAX_LENGTH - body.length < 50 ? 'low' : ''}`}>
              {MAX_LENGTH - body.length < 100 ? `${MAX_LENGTH - body.length} left` : ''}
            </span>
            <button className="btn" type="submit" disabled={loading || !body.trim()}>
              {loading ? 'Posting…' : replyTo ? 'Reply' : 'Comment'}
            </button>
          </div>
          {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
        </form>
      )}
    </>
  )
}
