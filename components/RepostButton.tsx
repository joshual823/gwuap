'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { RepostIcon } from './icons'

/**
 * Pass someone's post along, optionally with something to say about it.
 *
 * The box says "Write something", not "Add a take" — a take is a
 * specific kind of post on this site, and offering one here reads as a
 * rule about what you're allowed to write rather than an invitation.
 *
 * `targetId` is resolved by the caller to the original rather than to
 * whatever was on screen — reposting a repost points at the pick itself,
 * so a chain never nests and the card always shows the real thing.
 */
export default function RepostButton({ targetId, viewerId, count }: {
  targetId: string
  viewerId: string | null
  count: number
}) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Read inside a listener registered once, so it needs a ref rather than
  // the state value captured at mount.
  const commentRef = useRef('')

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      // A stray tap outside shouldn't throw away a half-written comment.
      // Closing on outside click is right for an empty box and hostile
      // once there's something in it, so it only closes while empty.
      if (commentRef.current.trim()) return
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  async function repost() {
    if (!viewerId) { router.push('/login'); return }
    setBusy(true); setError(null)
    const { error: insertError } = await supabase.from('posts').insert({
      author_id: viewerId,
      post_kind: 'take',
      sentiment: 'neutral',
      caption: comment.trim() || null,
      repost_of: targetId,
    })
    setBusy(false)
    if (insertError) { setError('Could not repost — try again.'); return }
    setOpen(false); setComment(''); commentRef.current = ''
    router.refresh()
  }

  return (
    <div className="post-menu-wrap" ref={wrapRef}>
      <button type="button" className="action-btn" aria-label="Repost"
        aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <RepostIcon />{count > 0 ? <span>{count}</span> : null}
      </button>

      {open && (
        <div className="post-menu repost-menu">
          <textarea
            className="field" rows={2} value={comment} maxLength={280}
            placeholder="Write something…"
            onChange={e => { setComment(e.target.value); commentRef.current = e.target.value }}
          />
          <button type="button" className="post-menu-item" onClick={repost} disabled={busy}>
            {busy ? 'Reposting…' : comment.trim() ? 'Repost with comment' : 'Repost'}
          </button>
          {comment.trim() && (
            <button type="button" className="post-menu-item"
              onClick={() => { setComment(''); commentRef.current = ''; setOpen(false) }}>
              Cancel
            </button>
          )}
          {error && <p className="post-menu-note danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
