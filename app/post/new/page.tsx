import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      {/* The other thing you might have come here to do. Somebody about
          to post a take is the person most likely to want to make
          somebody else stand behind theirs. */}
      <p className="post-alt">
        Or <Link href="/challenge/new" className="help-link">challenge someone head to head</Link> —
        you take a side, they take the other, the score settles it.
      </p>
      <NewPickForm />
    </Suspense>
  )
}
