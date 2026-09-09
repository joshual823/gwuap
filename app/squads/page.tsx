import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import FeedTabs from '@/components/FeedTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Squads' }

/**
 * Every squad, with the ones you're in first.
 *
 * Signed-in only. A squad list is a list of rooms you could walk into,
 * which is meaningless to somebody who can't walk into any of them —
 * and the rooms themselves are members-only, so a logged-out visitor
 * would be reading a menu they can't order from.
 */
export default async function SquadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/squads')

  const [{ data: squads }, { data: mine }] = await Promise.all([
    supabase.from('squads').select('id, slug, name, description, created_at')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('squad_members').select('squad_id').eq('user_id', user.id),
  ])

  const myIds = new Set((mine ?? []).map((m: any) => m.squad_id))
  const rows = (squads ?? []) as any[]

  // Counts in one query rather than one per squad.
  const { data: counts } = await supabase.from('squad_members').select('squad_id')
  const size = new Map<string, number>()
  for (const c of counts ?? []) size.set((c as any).squad_id, (size.get((c as any).squad_id) ?? 0) + 1)

  const joined = rows.filter(s => myIds.has(s.id))
  const rest = rows.filter(s => !myIds.has(s.id))

  const Card = ({ s, member }: { s: any; member: boolean }) => (
    <Link href={`/squads/${s.slug}`} className="squad-card" key={s.id}>
      <div className="squad-card-top">
        <span className="squad-name">{s.name}</span>
        {member && <span className="squad-badge">Joined</span>}
      </div>
      {s.description && <p className="squad-desc">{s.description}</p>}
      <span className="squad-meta mono">
        {size.get(s.id) ?? 0} {(size.get(s.id) ?? 0) === 1 ? 'member' : 'members'}
      </span>
    </Link>
  )

  return (
    <div>
      <FeedTabs active="squads" />
      <div className="squad-head" style={{ marginTop: 20 }}>
        <h1 className="display" style={{ fontSize: 22 }}>Squads</h1>
        <Link href="/squads/new" className="btn">Start one</Link>
      </div>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, margin: '4px 0 18px' }}>
        A group with its own live room. Everything said inside stays inside —
        only members can read it.
      </p>

      {joined.length > 0 && (
        <>
          <h2 className="rec-h2">Yours</h2>
          <div className="squad-list">{joined.map(s => <Card key={s.id} s={s} member />)}</div>
        </>
      )}

      <h2 className="rec-h2" style={{ marginTop: joined.length > 0 ? 24 : 0 }}>
        {joined.length > 0 ? 'Other squads' : 'All squads'}
      </h2>
      {rest.length === 0 ? (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginTop: 10 }}>
          {rows.length === 0
            ? 'None yet. The first one is yours to name.'
            : "You're in all of them."}
        </p>
      ) : (
        <div className="squad-list">{rest.map(s => <Card key={s.id} s={s} member={false} />)}</div>
      )}
    </div>
  )
}
