'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GradeReview({ postId, isOwn }: { postId: string; isOwn: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function grade(status: 'win' | 'loss' | 'push' | 'void') {
    setBusy(true); setError(null)
    const res = await fetch('/api/admin/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, status }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Could not grade that pick.')
      return
    }
    router.refresh()
  }

  // Shown rather than hidden, so it's obvious the rule exists and is
  // being applied — a missing row would just look like a bug.
  if (isOwn) {
    return (
      <p style={{ fontSize: 12.5, color: 'var(--pending)', marginTop: 8 }}>
        Your own pick — another admin has to settle this one.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn secondary" disabled={busy} onClick={() => grade('win')}
          style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>Win</button>
        <button className="btn secondary" disabled={busy} onClick={() => grade('loss')}
          style={{ borderColor: 'var(--bear)', color: 'var(--bear)' }}>Loss</button>
        <button className="btn secondary" disabled={busy} onClick={() => grade('push')}>Push</button>
        <button className="btn secondary" disabled={busy} onClick={() => grade('void')}>Void</button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 12.5, marginTop: 6 }}>{error}</p>}
    </div>
  )
}
