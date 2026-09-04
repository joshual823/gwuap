import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import ClaimUsernameForm from './ClaimUsernameForm'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Pick a username' }

export default async function ClaimUsernamePage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Already has one — nothing to claim.
  const { data: profile } = await supabase
    .from('profiles').select('username').eq('id', user.id).maybeSingle()
  if (profile) redirect(`/profile/${profile.username}`)

  // Google gives a display name; it's a decent first guess and saves
  // most people from thinking of one.
  const suggested = String(
    user.user_metadata?.name ?? user.user_metadata?.full_name ?? '',
  ).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)

  return (
    <div style={{ maxWidth: 380, margin: '48px auto' }}>
      <h1 className="page-title" style={{ marginBottom: 4 }}>Pick a username</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 18 }}>
        It&apos;s how you&apos;re known here — on your posts, your record and the
        leaderboard. You can change it later.
      </p>
      <ClaimUsernameForm
        userId={user.id}
        suggested={suggested.length >= 3 ? suggested : ''}
        next={next && next.startsWith('/') && !next.startsWith('//') ? next : '/feed'}
      />
    </div>
  )
}
