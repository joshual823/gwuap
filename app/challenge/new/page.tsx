import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import NewChallengeForm from './NewChallengeForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Challenge someone' }

export default async function NewChallengePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/challenge/new')

  // Leagues are a name on a game and an id on a post, so the mapping is
  // read once here rather than guessed at in the browser.
  const { data: cats } = await supabase.from('categories').select('id, name')
  return <NewChallengeForm userId={user.id} categories={(cats ?? []) as any} />
}
