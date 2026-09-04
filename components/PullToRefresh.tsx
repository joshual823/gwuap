'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 72   // how far down before it counts as a pull
const MAX = 110        // how far the indicator will travel

/**
 * Pull down from the top to reload.
 *
 * The browser's own gesture doesn't fire here: the page itself never
 * scrolls — the shell is a fixed-height flex column and a <main> inside
 * it does the scrolling — so the body is never at a scroll top for
 * Safari to react to. Every page in the app is affected, which is why
 * this lives in the layout rather than on one screen.
 *
 * router.refresh() rather than a reload: it re-renders the server
 * components with fresh data and keeps the scroll position and any
 * client state, which is the difference between a refresh and starting
 * the page again.
 */
export default function PullToRefresh({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const router = useRouter()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const el = target.current
    if (!el) return

    function onStart(e: TouchEvent) {
      // Only from the very top, or this fights ordinary scrolling.
      startY.current = el!.scrollTop <= 0 ? e.touches[0].clientY : null
    }

    function onMove(e: TouchEvent) {
      if (startY.current === null || busy) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { setPull(0); return }
      // Resistance, so it feels like pulling against something rather
      // than dragging a sheet of paper.
      setPull(Math.min(MAX, delta * 0.5))
    }

    async function onEnd() {
      const reached = pull >= THRESHOLD
      startY.current = null
      if (!reached || busy) { setPull(0); return }
      setBusy(true)
      setPull(THRESHOLD)
      router.refresh()
      // The refresh is not awaitable, so the spinner is held briefly
      // rather than flickering away before anything has changed.
      setTimeout(() => { setBusy(false); setPull(0) }, 900)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [target, pull, busy, router])

  if (pull <= 0) return null
  const ready = pull >= THRESHOLD

  return (
    <div className="ptr" style={{ height: pull }} aria-hidden="true">
      <span className={`ptr-mark ${busy ? 'spinning' : ''} ${ready ? 'ready' : ''}`}
        style={{ transform: `rotate(${pull * 3}deg)` }}>
        ↻
      </span>
    </div>
  )
}
