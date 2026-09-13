'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/**
 * Opt in to the watchlist tidying itself.
 *
 * Only rendered when there is something in the list — a switch for a
 * problem you don't have yet is noise, and the empty watchlist already
 * has one job, which is to explain what a watchlist is for.
 *
 * Optimistic with a rollback, like WatchButton: a silent failure on a
 * toggle is indistinguishable from a toggle that doesn't work.
 */
export default function WatchlistAutoClean({ viewerId, initial }: {
  viewerId: string
  initial: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !on
    setOn(next); setBusy(true); setError(null)
    const { error: writeError } = await supabase
      .from('profiles').update({ watchlist_autoclean: next }).eq('id', viewerId)
    setBusy(false)
    if (writeError) { setOn(!next); setError(writeError.message); return }
    // Turning it on should visibly do the thing, not promise to do it
    // next time — the page clears finished games on load.
    router.refresh()
  }

  return (
    <div className="wl-clean">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`wl-switch ${on ? 'on' : ''}`}
        onClick={toggle}
        disabled={busy}
      >
        <span className="wl-knob" />
      </button>
      <div className="wl-clean-text">
        <strong>Clear finished games</strong>
        <span>
          Drops a starred game about a day after it ends. Teams you watch stay put.
        </span>
        {error && <span className="wl-clean-error">{error}</span>}
      </div>
    </div>
  )
}
