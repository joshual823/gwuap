'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONTEST, deadlineLabel } from '@/lib/contest'
import { FOUNDING_LIMIT } from '@/lib/badges'

const SEEN_KEY = 'gwuap:welcome-seen'
const WAIT_MS = 3000

/**
 * The pitch, once, to a logged-out visitor.
 *
 * Shown a single time per browser — a modal on every visit is how a site
 * teaches people to close it without reading. The close button unlocks
 * after three seconds, with a bar showing the wait, which is what was
 * asked for; it's worth knowing that forcing a wait costs some people
 * who would otherwise have scrolled, so the number below the bar is
 * there to make the wait feel purposeful rather than arbitrary.
 */
export default function WelcomeModal({ remaining }: { remaining: number | null }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* private mode */ }
    if (seen) return

    setOpen(true)
    const started = Date.now()
    const tick = setInterval(() => {
      const done = Math.min(1, (Date.now() - started) / WAIT_MS)
      setProgress(done)
      if (done >= 1) clearInterval(tick)
    }, 50)
    return () => clearInterval(tick)
  }, [])

  function close() {
    if (progress < 1) return
    setOpen(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ditto */ }
  }

  if (!open) return null
  const ready = progress >= 1

  return (
    <div className="welcome-backdrop" role="dialog" aria-modal="true" aria-label="Welcome to Gwuap">
      <div className="welcome-card">
        <div className="welcome-art" aria-hidden="true">
          <span className="welcome-chip win">WIN</span>
          <span className="welcome-chip amt">+$45.45</span>
          <span className="welcome-tag">$SF −1.5</span>
          <span className="welcome-glow" />
        </div>

        <h2>Everyone says they went 4-1.</h2>
        <p>
          Post your picks and the final score grades them — automatically,
          from the scoreboard. No screenshots, no self-reporting, and you
          can&apos;t edit a record after the fact.
        </p>

        <ul className="welcome-points">
          <li>Free. No deposit, nothing at risk.</li>
          <li>Top three records win ${CONTEST.prize} · {deadlineLabel()}.</li>
          {remaining !== null && remaining > 0 && (
            <li><strong>{remaining} of {FOUNDING_LIMIT} founding places left.</strong></li>
          )}
        </ul>

        <Link href="/signup" className="btn welcome-cta" onClick={close}>
          Claim your spot
        </Link>

        <button type="button" className="welcome-close" onClick={close} disabled={!ready}>
          {ready ? 'Maybe later' : 'Have a look first…'}
          <span className="welcome-bar" aria-hidden="true">
            <span className="welcome-bar-fill" style={{ width: `${progress * 100}%` }} />
          </span>
        </button>
      </div>
    </div>
  )
}
