'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { CLARITY_EXCLUDED } from '@/components/Clarity'

/**
 * Stops Clarity when a client-side navigation lands on an excluded page.
 *
 * `Clarity.tsx` checks the path once, when the tag loads. That protects
 * somebody who opens /vent directly and nobody else: open /feed first and
 * Clarity is already running, and moving to /vent client-side doesn't
 * unload it. Unmounting a <Script> never did — the old `usePathname`
 * version had exactly this hole, it just looked like it didn't.
 *
 * So the guard has to be an instruction to Clarity rather than an absence
 * of markup. `clarity('stop')` is that instruction. If a future version
 * of Clarity drops it the call becomes a no-op on their queue and this
 * silently stops working, which is worth knowing — the load-time check in
 * Clarity.tsx is the one that can't rot.
 *
 * It restarts on the way out, and only if this component was what stopped
 * it, so leaving Vent doesn't resurrect a session the visitor disabled
 * some other way.
 */
export default function ClarityGuard() {
  const pathname = usePathname()
  const stoppedByUs = useRef(false)

  useEffect(() => {
    const clarity = (window as unknown as { clarity?: (cmd: string) => void }).clarity
    if (typeof clarity !== 'function') return

    const excluded = CLARITY_EXCLUDED.some(p => pathname?.startsWith(p))
    if (excluded && !stoppedByUs.current) {
      clarity('stop')
      stoppedByUs.current = true
    } else if (!excluded && stoppedByUs.current) {
      clarity('start')
      stoppedByUs.current = false
    }
  }, [pathname])

  return null
}
