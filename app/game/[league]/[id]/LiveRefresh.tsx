'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-fetches while a game is in progress, so "live" means live. */
export default function LiveRefresh({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      // Never refresh out from under someone mid-message.
      const el = document.activeElement
      const typing = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
      if (!document.hidden && !typing) router.refresh()
    }, 30000)
    return () => clearInterval(id)
  }, [active, router])
  return null
}
