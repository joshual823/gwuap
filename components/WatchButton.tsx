'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/** Star toggle. Optimistic, and rolls back if the write is refused. */
export default function WatchButton({
  ticker, league, initiallyWatched, viewerId, label, kind = 'ticker',
}: {
  ticker: string
  league?: string | null
  initiallyWatched: boolean
  viewerId: string | null
  label?: boolean
  /** 'game' watches one fixture; 'ticker' watches a team or player. */
  kind?: 'ticker' | 'game'
}) {
  const supabase = createClient()
  const router = useRouter()
  const [on, setOn] = useState(initiallyWatched)
  const [busy, setBusy] = useState(false)
  // A silent rollback looks identical to a button that does nothing.
  const [error, setError] = useState<string | null>(null)

  const code = ticker.replace(/^\$/, '').toUpperCase()

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!viewerId) { router.push('/login'); return }
    const next = !on
    setOn(next)
    setBusy(true)
    const { error: writeError } = next
      ? await supabase.from('watchlist')
          .insert({ user_id: viewerId, ticker: code, league: league ?? null, kind })
      : await supabase.from('watchlist').delete().match({ user_id: viewerId, ticker: code })
    setBusy(false)
    if (writeError) { setOn(!next); setError(writeError.message); return }
    setError(null)
    router.refresh()
  }

  return (
    <button
      type="button"
      className={`watch-btn ${on ? 'on' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? `Unwatch ${code}` : `Watch ${code}`}
      title={on ? `Unwatch ${code}` : `Watch ${code}`}
    >
      <span className="watch-star">{on ? '★' : '☆'}</span>
      {label && <span className="watch-label">{on ? 'Watching' : 'Watch'}</span>}
      {error && <span className="watch-error">{error}</span>}
    </button>
  )
}
