import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import NewPickForm from './NewPickForm'

export const dynamic = 'force-dynamic'

export default async function NewPostPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Gate before the form renders. Letting someone fill in a bet type,
  // league, cashtag, odds and stake and only then bouncing them to login
  // throws away their work.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    /**
     * Carry the query string through the login round trip.
     *
     * This used to redirect to a bare `/login?next=/post/new`, which
     * quietly dropped everything after the `?`. Two things arrive here
     * with one: `?tour=1`, from the welcome email's "Show me how" — and
     * email is read on whichever device is to hand, so *not* being
     * signed in is the normal case, not the edge one — and the
     * `league` + `headline` pair from posting about a news story.
     * Both were lost at exactly the moment they mattered.
     *
     * Encoded, because `next=/post/new?tour=1` unencoded would be read
     * as two separate parameters and `next` would arrive truncated —
     * which is the same bug again, one layer down.
     */
    const search = await props.searchParams
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(search)) {
      if (typeof v === 'string') qs.set(k, v)
    }
    const back = qs.toString() ? `/post/new?${qs}` : '/post/new'
    redirect(`/login?next=${encodeURIComponent(back)}`)
  }

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
