import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import NewPickForm from './NewPickForm'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  // Gate before the form renders. Letting someone fill in a bet type,
  // league, cashtag, odds and stake and only then bouncing them to login
  // throws away their work.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/post/new')

  // The form reads search params (league + headline, when you arrive from
  // a news story), which needs a Suspense boundary around it.
  return (
    <Suspense fallback={<p style={{ marginTop: 40, color: 'var(--ink-dim)' }}>Loading…</p>}>
      <NewPickForm />
    </Suspense>
  )
}
