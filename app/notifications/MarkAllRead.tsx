'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/**
 * Opening the page is the acknowledgement, so there's no button.
 * Refreshes afterwards so the header badge clears too.
 */
export default function MarkAllRead({ userId, unreadCount }: { userId: string; unreadCount: number }) {
  const router = useRouter()
  useEffect(() => {
    if (unreadCount === 0) return
    const supabase = createClient()
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .then(() => router.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, unreadCount])
  return null
}
