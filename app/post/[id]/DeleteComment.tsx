'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function DeleteComment({ commentId }: { commentId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    setBusy(false)
    if (error) { setConfirming(false); return }
    router.refresh()
  }

  if (!confirming) {
    return <button className="comment-del" onClick={() => setConfirming(true)}>Delete</button>
  }
  return (
    <span className="comment-del-confirm">
      <button className="comment-del danger" onClick={remove} disabled={busy}>
        {busy ? 'Deleting…' : 'Really delete?'}
      </button>
      <button className="comment-del" onClick={() => setConfirming(false)}>Cancel</button>
    </span>
  )
}
