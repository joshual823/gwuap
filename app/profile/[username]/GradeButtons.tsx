'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { profitForStatus, formatSignedUsd } from '@/lib/odds'

export default function GradeButtons({ postId, odds, stake }: {
  postId: string
  odds: string | null
  stake: number | null
}) {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Grading is where a pick turns into a dollar figure: the profit is
  // derived from the odds and stake already on the post, never typed in.
  async function grade(status: 'win' | 'loss' | 'push') {
    setError(null)
    const profit = profitForStatus(status, odds, stake)
    const { error: updateError } = await supabase
      .from('posts')
      .update({ status, profit })
      .eq('id', postId)
    if (updateError) { setError('Could not grade that pick — try again.'); return }
    router.refresh()
  }

  const win = profitForStatus('win', odds, stake)
  const loss = profitForStatus('loss', odds, stake)

  return (
    <div style={{ margin: '-8px 0 16px' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn secondary" onClick={() => grade('win')} style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
          Mark win{win != null && ` (${formatSignedUsd(win)})`}
        </button>
        <button className="btn secondary" onClick={() => grade('loss')} style={{ borderColor: 'var(--bear)', color: 'var(--bear)' }}>
          Mark loss{loss != null && ` (${formatSignedUsd(loss)})`}
        </button>
        <button className="btn secondary" onClick={() => grade('push')}>Push</button>
      </div>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  )
}
