import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import Avatar from '@/components/Avatar'
import SquadChat from '@/components/SquadChat'
import SquadMembership from './SquadMembership'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Squad · ${slug}` }
}

export default async function SquadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/squads/${encodeURIComponent(slug)}`)

  const { data: squad } = await supabase
    .from('squads').select('id, slug, name, description, owner_id, created_at')
    .eq('slug', slug.toLowerCase()).maybeSingle()
  if (!squad) notFound()

  const { data: members } = await supabase
    .from('squad_members')
    .select('user_id, role, joined_at, profile:profiles!squad_members_user_id_fkey ( username, avatar_url )')
    .eq('squad_id', squad.id)
    .order('joined_at', { ascending: true })

  const rows = (members ?? []) as any[]
  const isMember = rows.some(m => m.user_id === user.id)
  const isOwner = squad.owner_id === user.id

  return (
    <div style={{ marginTop: 24 }}>
      <p className="rec-back"><Link href="/squads" className="help-link">← Squads</Link></p>

      <div className="squad-head">
        <h1 className="display" style={{ fontSize: 22 }}>{squad.name}</h1>
        <SquadMembership squadId={squad.id} userId={user.id} isMember={isMember} isOwner={isOwner} />
      </div>
      {squad.description && (
        <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, lineHeight: 1.5, margin: '4px 0 0' }}>
          {squad.description}
        </p>
      )}

      <div className="squad-members">
        {rows.map(m => (
          <Link key={m.user_id} href={`/profile/${m.profile?.username}`} className="squad-member"
            title={m.role === 'owner' ? `@${m.profile?.username} — owner` : `@${m.profile?.username}`}>
            <Avatar url={m.profile?.avatar_url} size={26} name={m.profile?.username} />
            <span className="squad-member-name">
              @{m.profile?.username}{m.role === 'owner' && <span className="squad-owner-tag">owner</span>}
            </span>
          </Link>
        ))}
      </div>

      <SquadChat squadId={squad.id} viewerId={user.id} isMember={isMember} />
    </div>
  )
}
