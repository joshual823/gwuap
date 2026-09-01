import { Suspense } from 'react'
import NewPickForm from './NewPickForm'

export const dynamic = 'force-dynamic'

export default function NewPostPage() {
  // The form reads search params (league + headline, when you arrive from
  // a news story), which needs a Suspense boundary around it.
  return (
    <Suspense fallback={<p style={{ marginTop: 40, color: 'var(--ink-dim)' }}>Loading…</p>}>
      <NewPickForm />
    </Suspense>
  )
}
