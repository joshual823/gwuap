'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function GradeButtons({ postId }: { postId: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function grade(status: 'win' | 'loss' | 'push') {
    await supabase.from('posts').update({ status }).eq('id', postId)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 8, margin: '-8px 0 16px' }}>
      <button className="btn secondary" onClick={() => grade('win')} style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>Mark win</button>
      <button className="btn secondary" onClick={() => grade('loss')} style={{ borderColor: 'var(--bear)', color: 'var(--bear)' }}>Mark loss</button>
      <button className="btn secondary" onClick={() => grade('push')}>Push</button>
    </div>
  )
}
