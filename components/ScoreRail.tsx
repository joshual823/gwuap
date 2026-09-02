'use client'
import { useEffect, useRef } from 'react'

/**
 * Auto-scrolling rail that stays a real scroll container.
 *
 * A CSS transform marquee can only be paused — the element isn't
 * actually scrolling, so a finger on it does nothing. This drives
 * `scrollLeft` instead, so the rail is always natively swipeable: put a
 * finger or cursor on it and the drift stops and you take over; let go
 * and it resumes from wherever you left it.
 *
 * The caller renders the games twice; when the first copy has passed we
 * jump back by half the width, which is invisible because the second
 * copy is identical.
 */
const SPEED = 0.35 // px per frame ≈ 21px/s at 60fps

export default function ScoreRail({ loop, children }: {
  loop: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const paused = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !loop) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const step = () => {
      frame = requestAnimationFrame(step)
      if (paused.current || document.hidden) return
      const half = el.scrollWidth / 2
      if (half <= 0) return
      el.scrollLeft += SPEED
      if (el.scrollLeft >= half) el.scrollLeft -= half
    }
    frame = requestAnimationFrame(step)

    const hold = () => { paused.current = true }
    const release = () => { paused.current = false }

    el.addEventListener('pointerenter', hold)
    el.addEventListener('pointerdown', hold)
    el.addEventListener('touchstart', hold, { passive: true })
    el.addEventListener('focusin', hold)
    el.addEventListener('pointerleave', release)
    el.addEventListener('pointerup', release)
    el.addEventListener('touchend', release, { passive: true })
    el.addEventListener('touchcancel', release, { passive: true })
    el.addEventListener('focusout', release)

    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointerenter', hold)
      el.removeEventListener('pointerdown', hold)
      el.removeEventListener('touchstart', hold)
      el.removeEventListener('focusin', hold)
      el.removeEventListener('pointerleave', release)
      el.removeEventListener('pointerup', release)
      el.removeEventListener('touchend', release)
      el.removeEventListener('touchcancel', release)
      el.removeEventListener('focusout', release)
    }
  }, [loop])

  return (
    <div className="board-rail" ref={ref}>
      <div className="board-track">{children}</div>
    </div>
  )
}
