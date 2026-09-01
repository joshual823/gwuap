'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function MarkRead({ conversationId, userId, unreadCount }: {
  conversationId: string
  userId: string
  unreadCount: number
}) {
  const router = useRouter()
  useEffect(() => {
    if (unreadCount === 0) return
    const supabase = createClient()
    supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null)
      .then(() => router.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId, unreadCount])
  return null
}
