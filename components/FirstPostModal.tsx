'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SEEN_KEY = 'gwuap:first-post-seen'

/**
 * Long enough for the feed to paint first.
 *
 * Opening on the same frame as the page means the card is the only thing
 * they ever see of the site, and it reads as a wall rather than a
 * welcome. A beat later they've registered that they arrived somewhere,
 * and the card is an offer on top of it.
 */
const SETTLE_MS = 1100

/**
 * The first thing a new member sees, and the only job it has is getting
 * them to post once.
 *
 * **Why it's keyed on having no posts rather than on being a new
 * account.** "Has never posted" is the condition the card is actually
 * about, and it's already in the database — no migration, no flag to
 * set, and nothing to clean up. It stops appearing the moment the thing
 * it's asking for happens, which is the behaviour a `welcomed_at` column
 * would have needed extra code to imitate.
 *
 * The dismissal is per-browser rather than per-account, deliberately:
 * this is a nudge, and a nudge that survives being closed is nagging.
 * Someone who dismisses it and later wants the walkthrough can still
 * reach it — `/post/new?tour=1` is a normal URL, linked from help.
 */
export default function FirstPostModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* private mode */ }
    if (seen) return
    const t = setTimeout(() => setOpen(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  function close() {
    setOpen(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ditto */ }
  }

  function start() {
    close()
    router.push('/post/new?tour=1')
  }

  if (!open) return null

  return (
    <div className="welcome-backdrop" role="dialog" aria-modal="true" aria-label="Welcome to Gwuap">
      <div className="welcome-card">
        <div className="welcome-hero">
          <span className="welcome-hero-line">Welcome</span>
          <span className="welcome-sub">you&apos;re part of the new wave</span>
        </div>

        <h2>Post your first pick or take today</h2>
        <p>Thanks for joining. There are two ways in, and both take a minute:</p>

        {/* A list rather than a paragraph: these are two definitions being
            told apart, and the thing a new member needs is to see the
            difference at a glance, not read their way to it. */}
        <ul className="welcome-points">
          <li><strong>Take</strong> — your opinion on a player or team.</li>
          <li><strong>Pick</strong> — what you think the outcome of a game or
            match will be. This one counts toward your record.</li>
        </ul>

        <p className="welcome-second">
          We&apos;ll point at each field as you go.
        </p>

        <button type="button" className="btn welcome-cta" onClick={start}>
          Show me how
        </button>
        <button type="button" className="welcome-close" onClick={close}>
          I&apos;ll look around first
        </button>
      </div>
    </div>
  )
}
