import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import Avatar from '@/components/Avatar'
import SquadChat from '@/components/SquadChat'
import SquadMembership from './SquadMembership'
import SquadInvite from './SquadInvite'
import { SITE_URL, SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('squads').select('name, description')
    .eq('slug', slug.toLowerCase()).maybeSingle()
  // A shared link previews with the squad's own name rather than the
  // site's, which is what somebody forwarding it to a group chat is
  // actually pointing at.
  return {
    title: data?.name ? `${data.name} · ${SITE_NAME}` : `Squad · ${slug}`,
    description: data?.description ?? `A squad on ${SITE_NAME}. Picks graded by the final score.`,
  }
}

export default async function SquadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: squad } = await supabase
    .from('squads').select('id, slug, name, description, owner_id, created_at')
    .eq('slug', slug.toLowerCase()).maybeSingle()
  if (!squad) notFound()

  // A stranger following a link from a group chat sees what the squad is
  // and what it would take to join, and nothing that's been said in it.
  // Sending them to a login wall first would mean signing up to find out
  // what you were signing up to.
  if (!user) {
    return (
      <div className="legal">
        <h1 className="page-title">{squad.name}</h1>
        {squad.description && <p className="legal-sub">{squad.description}</p>}
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-dim)' }}>
          A squad on {SITE_NAME} — a group with its own room. Only members can
          read what&apos;s said inside, which is why you can&apos;t see it yet.
        </p>
        <p style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Link href={`/signup?next=/squads/${squad.slug}`} className="btn">Sign up free</Link>
          <Link href={`/login?next=/squads/${squad.slug}`} className="btn secondary">Log in</Link>
        </p>
        <p className="rec-foot">
          Free, nothing to deposit. Every pick on {SITE_NAME} is graded from the
          final score — nobody grades their own.
        </p>
      </div>
    )
  }

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

      {/* Only members can invite, which the policy enforces too — a
          non-member pressing this would just be refused. */}
      {isMember && (
        <SquadInvite
          squadId={squad.id}
          squadName={squad.name}
          userId={user.id}
          url={`${SITE_URL}/squads/${squad.slug}`}
        />
      )}
    </div>
  )
}
