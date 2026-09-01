'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/**
 * Per-post overflow menu: delete your own, report someone else's.
 *
 * Reports carry the post id as well as the author id. Before this,
 * reports could only name a user, so the admin panel's "Remove post"
 * button had nothing to act on and never rendered.
 */
export default function PostMenu({
  postId, authorId, viewerId,
}: {
  postId: string
  authorId: string
  viewerId: string | null
}) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'confirmDelete' | 'report' | 'reported'>('menu')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const isMine = viewerId !== null && viewerId === authorId

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setMode('menu')
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  async function remove() {
    setBusy(true); setError(null)
    const { error: delError } = await supabase.from('posts').delete().eq('id', postId)
    setBusy(false)
    if (delError) { setError('Could not delete — try again.'); return }
    setOpen(false)
    // On the post's own page there's nothing left to show.
    if (pathname?.startsWith('/post/')) router.push('/feed')
    else router.refresh()
  }

  async function report() {
    if (!viewerId) { router.push('/login'); return }
    if (!reason.trim()) return
    setBusy(true); setError(null)
    const { error: repError } = await supabase.from('reports').insert({
      reporter_id: viewerId,
      reported_user_id: authorId,
      reported_post_id: postId,
      reason: reason.trim(),
    })
    setBusy(false)
    if (repError) { setError('Could not send that report — try again.'); return }
    setMode('reported')
  }

  if (!viewerId) return null

  return (
    <div className="post-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="post-menu-btn"
        aria-label="Post options"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setMode('menu') }}
      >⋯</button>

      {open && (
        <div className="post-menu">
          {mode === 'menu' && (isMine ? (
            <button type="button" className="post-menu-item danger" onClick={() => setMode('confirmDelete')}>
              Delete pick
            </button>
          ) : (
            <button type="button" className="post-menu-item" onClick={() => setMode('report')}>
              Report pick
            </button>
          ))}

          {mode === 'confirmDelete' && (
            <>
              <p className="post-menu-note">Delete this pick for good? Its comments go too.</p>
              <button type="button" className="post-menu-item danger" onClick={remove} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" className="post-menu-item" onClick={() => setMode('menu')}>Cancel</button>
            </>
          )}

          {mode === 'report' && (
            <>
              <p className="post-menu-note">What's wrong with it?</p>
              <input
                className="field" style={{ margin: '0 0 6px' }} autoFocus
                placeholder="Reason" value={reason}
                onChange={e => setReason(e.target.value)}
              />
              <button type="button" className="post-menu-item" onClick={report} disabled={busy || !reason.trim()}>
                {busy ? 'Sending…' : 'Send report'}
              </button>
            </>
          )}

          {mode === 'reported' && <p className="post-menu-note">Report sent. Thanks.</p>}
          {error && <p className="post-menu-note danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
