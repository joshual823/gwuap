'use client'
import { useRouter } from 'next/navigation'

export default function AdminActions({ reportId, userId, postId, messageId, ventId }: { reportId: string; userId?: string; postId?: string; messageId?: string; ventId?: string }) {
  const router = useRouter()

  async function act(action: 'ban' | 'remove_post' | 'remove_message' | 'remove_vent' | 'dismiss') {
    await fetch('/api/admin/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, userId, postId, messageId, ventId, action }),
    })
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button className="btn secondary" onClick={() => act('dismiss')}>Dismiss</button>
      {postId && <button className="btn secondary" onClick={() => act('remove_post')}>Remove post</button>}
      {messageId && <button className="btn secondary" onClick={() => act('remove_message')}>Remove message</button>}
      {ventId && <button className="btn secondary" onClick={() => act('remove_vent')}>Remove message</button>}
      {userId && (
        <button className="btn secondary" style={{ borderColor: 'var(--bear)', color: 'var(--bear)' }} onClick={() => act('ban')}>
          Ban user
        </button>
      )}
    </div>
  )
}
