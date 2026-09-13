'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { FOUNDING_LIMIT } from '@/lib/badges'

const SEEN_KEY = 'gwuap:welcome-seen'

/**
 * Pages that are already a pitch, and so must not get a second one.
 *
 * `/squads` is the ad's landing page: it has its own headline, its own
 * proof and its own call to action. Firing a modal over it interrupts
 * somebody mid-read to make a *different* offer, which is competition
 * rather than persuasion — and reading is exactly what the two visitors
 * we watched on 13 Sep were doing when this would have fired.
 */
const NO_MODAL = ['/squads', '/signup', '/login']

/** How far down the feed counts as "they're actually reading this". */
const SCROLL_TRIGGER_PX = 600

/** And the backstop, for someone who reads the top of the page and stops. */
const TIME_TRIGGER_MS = 15_000

/**
 * The pitch, once, to a logged-out visitor — after they've seen the site,
 * not before.
 *
 * It used to open on arrival and lock its own close button for three
 * seconds. That's survivable for someone who typed the address in; it is
 * the wrong way to meet somebody who clicked an ad, because they have no
 * idea yet what they'd be signing up for and the first thing the site
 * does is refuse to get out of the way.
 *
 * So it waits for a sign of interest: 600px of scrolling, or fifteen
 * seconds, whichever comes first. The modal describes automatic grading;
 * the feed demonstrates it, with real picks carrying real results. The
 * demonstration should go first.
 *
 * The close button no longer locks. Once somebody has scrolled the feed,
 * making them sit through a progress bar buys nothing.
 *
 * Note the listener is on `main.scroll`, not the window: the document
 * itself never scrolls here — `html, body { overflow: hidden }` — so a
 * window scroll handler would sit there and never fire once.
 */
export default function WelcomeModal({ remaining }: { remaining: number | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const muted = NO_MODAL.some(p => pathname === p || pathname?.startsWith(p + '/'))

  useEffect(() => {
    if (muted) return
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* private mode */ }
    if (seen) return

    const scroller = document.querySelector<HTMLElement>('main.scroll')
    let done = false
    const show = () => {
      if (done) return
      done = true
      setOpen(true)
      cleanup()
    }
    const onScroll = () => {
      const top = scroller ? scroller.scrollTop : window.scrollY
      if (top > SCROLL_TRIGGER_PX) show()
    }
    const timer = setTimeout(show, TIME_TRIGGER_MS)
    function cleanup() {
      clearTimeout(timer)
      scroller?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    // Belt and braces: if the shell is ever restructured so the document
    // scrolls again, this keeps working instead of silently never firing.
    if (!scroller) window.addEventListener('scroll', onScroll, { passive: true })
    return cleanup
  }, [muted])

  function close() {
    setOpen(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ditto */ }
  }

  if (!open) return null

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

        <h2>Free to join. No card, ever.</h2>
        <p>
          Post a pick and the scoreboard settles it. Nobody grades their own,
          and nothing can be edited once a game starts — so a record here
          means something.
        </p>

        <ul className="welcome-points">
          <li><strong>Costs nothing.</strong> We never ask for a card.</li>
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

        {/* "Look around more", not "Maybe later".
            Both close the card; only one of them says what happens next.
            "Maybe later" is a dismissal and reads as the end of the
            conversation — the visitor has to work out for themselves that
            the site is still there behind it. The softer second door is
            what the squads page found worked: somebody who isn't ready to
            sign up will still keep reading, and the feed underneath is the
            argument. Same reason the paid ads point at "/" rather than a
            form — be introduced first, decide after. */}
        <button type="button" className="welcome-close" onClick={close}>
          Look around more
        </button>
      </div>
    </div>
  )
}
