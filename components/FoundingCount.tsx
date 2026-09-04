'use client'
import { useEffect, useState } from 'react'
import { FOUNDING_LIMIT } from '@/lib/badges'

/**
 * The remaining founding places, on the signup page.
 *
 * Scarcity only works if it's checkable, so this is the live count
 * rather than a number typed into the copy. It renders nothing at all
 * if the count can't be read or the places are gone — an offer that
 * has quietly expired shouldn't still be on the page.
 */
export default function FoundingCount() {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/founding')
      .then(r => r.json())
      .then(d => { if (!cancelled) setRemaining(d.remaining ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (remaining === null || remaining <= 0) return null

  return (
    <p className="founding-note">
      <strong>{remaining} of {FOUNDING_LIMIT} founding places left.</strong>{' '}
      Only the first {FOUNDING_LIMIT} accounts get the founding badge.
    </p>
  )
}
