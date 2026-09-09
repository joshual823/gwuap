'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import MentionInput from '@/components/MentionInput'
import RichText from '@/components/RichText'

type Author = { id: string; username: string; avatar_url: string | null }
type Comment = { id: string; body: string; created_at: string; author: Author | null }

const MAX = 500

/**
 * The thread under a highlight.
 *
 * Readable signed out on purpose — this is a comment under a public
 * video on a public page, not a room. A visitor arriving from an ad
 * should be able to see that somebody is here, which is the one thing a
 * site this size can't fake and shouldn't hide.
 */
export default function ClipComments({ videoId, viewerId }: {
  videoId: string
  viewerId: string | null
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    const supabase = createClient()
    supabase
      .from('clip_comments')
      .select('id, body, created_at, author:profiles!clip_comments_author_id_fkey ( id, username, avatar_url )')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!live.current) return
        setComments((data ?? []) as unknown as Comment[])
        setLoading(false)
      })
    return () => { live.current = false }
  }, [videoId])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || !viewerId) return
    setSending(true); setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('clip_comments')
      .insert({ video_id: videoId, author_id: viewerId, body: text })
      .select('id, body, created_at, author:profiles!clip_comments_author_id_fkey ( id, username, avatar_url )')
      .single()
    setSending(false)
    if (err) { setError(err.message); return }
    setBody('')
    if (data) setComments(cur => [...cur, data as unknown as Comment])
  }

  async function remove(id: string) {
    if (!confirm('Delete this comment?')) return
    const supabase = createClient()
    await supabase.from('clip_comments').delete().eq('id', id)
    setComments(cur => cur.filter(c => c.id !== id))
  }

  return (
    <section className="clip-comments">
      <h2 className="rec-h2">
        {loading ? 'Comments' : comments.length === 0 ? 'Comments' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </h2>

      {!loading && comments.length === 0 && (
        <p className="rec-note">Nothing said about this one yet.</p>
      )}

      <div className="clip-comment-list">
        {comments.map(c => (
          <div className="gc-msg" key={c.id}>
            <Link href={`/profile/${c.author?.username}`}>
              <Avatar url={c.author?.avatar_url} size={26} name={c.author?.username} />
            </Link>
            <div className="gc-body">
              <div className="gc-head">
                <Link href={`/profile/${c.author?.username}`} className="uname">@{c.author?.username}</Link>
                <span className="time">{timeAgo(c.created_at)}</span>
                {c.author?.id === viewerId && (
                  <button type="button" className="gc-del" onClick={() => remove(c.id)}>Delete</button>
                )}
              </div>
              <RichText text={c.body} className="gc-text" />
            </div>
          </div>
        ))}
      </div>

      {viewerId ? (
        <form onSubmit={send} className="gc-form">
          <MentionInput rows={2} maxLength={MAX} value={body} onChange={setBody}
            placeholder="Say something…" />
          <div className="comment-form-foot">
            <span className="comment-count-left">
              {MAX - body.length < 100 ? `${MAX - body.length} left` : ''}
            </span>
            <button className="btn" type="submit" disabled={sending || !body.trim()}>
              {sending ? 'Posting…' : 'Comment'}
            </button>
          </div>
          {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
        </form>
      ) : (
        <p className="comment-signin">
          <Link href="/login" className="comment-signin-link">Log in</Link> to comment.
        </p>
      )}
    </section>
  )
}
