'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
        {/* What leads has to be the reason a stranger stays, and with the
            prize gone that's the thing nobody else offers: a record that
            isn't self-reported. The founding count sits under it as the
            reason to do it today rather than eventually. */}
        <div className="welcome-hero">
          <span className="welcome-hero-line">Graded</span>
          <span className="welcome-sub">
            by the final score, not by you
          </span>
        </div>

        <h2>Free to post. Nothing to deposit.</h2>
        <p>
          Post a pick and the scoreboard settles it. Nobody grades their own,
          and nothing can be edited once a game starts — so a record here
          means something.
        </p>

        <ul className="welcome-points">
          <li><strong>$0 to play.</strong> No deposit, no card, no stake.</li>
          <li><strong>Open to everyone.</strong> Sign up and you&apos;re in.</li>
          <li><strong>No self-reporting.</strong> The scoreboard decides, not you.</li>
          {remaining !== null && remaining > 0 && (
            <li><strong>{remaining} founding places left</strong> of {FOUNDING_LIMIT}.</li>
          )}
        </ul>

        <Link href="/signup" className="btn welcome-cta" onClick={close}>
          Sign up free
        </Link>
        <Link href="/help" className="welcome-rules" onClick={close}>
          How it works
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
