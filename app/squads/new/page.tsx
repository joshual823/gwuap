import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import NewSquadForm from './NewSquadForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Start a squad' }

export default async function NewSquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/squads/new')
  return <NewSquadForm userId={user.id} />
}
