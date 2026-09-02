'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-fetches while a game is in progress, so "live" means live. */
export default function LiveRefresh({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      if (!document.hidden) router.refresh()
    }, 30000)
    return () => clearInterval(id)
  }, [active, router])
  return null
}
