'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button className="btn secondary" onClick={logout} disabled={busy}>
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  )
}
