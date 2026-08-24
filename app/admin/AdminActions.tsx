'use client'
import { useRouter } from 'next/navigation'

export default function AdminActions({ reportId, userId, postId }: { reportId: string; userId?: string; postId?: string }) {
  const router = useRouter()

  async function act(action: 'ban' | 'remove_post' | 'dismiss') {
    await fetch('/api/admin/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, userId, postId, action }),
    })
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button className="btn secondary" onClick={() => act('dismiss')}>Dismiss</button>
      {postId && <button className="btn secondary" onClick={() => act('remove_post')}>Remove post</button>}
      {userId && (
        <button className="btn secondary" style={{ borderColor: 'var(--bear)', color: 'var(--bear)' }} onClick={() => act('ban')}>
          Ban user
        </button>
      )}
    </div>
  )
}
