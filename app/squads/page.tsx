import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import FeedTabs from '@/components/FeedTabs'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Squads' }

/**
 * Every squad, with the ones you're in first.
 *
 * Signed in, that's the page. Logged out it used to redirect to /login,
 * on the reasoning that a list of rooms you can't enter is a menu you
 * can't order from. That reasoning is still right about the *list* and
 * wrong about the page, and paid traffic is what exposed the difference:
 * an ad for squad rooms landed a stranger on a bare login form, which is
 * the same broken promise as an ad for a prize that no longer exists.
 *
 * `/squads/[slug]` already settled this for a single room — "sending them
 * to a login wall first would mean signing up to find out what you were
 * signing up to". The index now does what that page does: say what a
 * squad is, then offer the door. The list still isn't shown, because
 * that part of the old reasoning holds.
 */
export default async function SquadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SquadsIntro />

  const [{ data: squads }, { data: mine }] = await Promise.all([
    supabase.from('squads').select('id, slug, name, description, avatar_url, created_at')
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
        <Avatar url={s.avatar_url} size={30} name={s.name} />
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

      {/* A line, not a banner. It's the site's own room and it's always
          open — worth knowing about, not worth taking the page over. */}
      <Link href="/vent" className="vent-line">
        Join the Vent room to vent about the losses →
      </Link>

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

/**
 * What a squad is, for somebody who isn't signed in — an ad's landing
 * page as much as a page. Every claim on it is a thing the room actually
 * does: members-only is enforced by RLS, the grading is the site's, and
 * the table is `standings` over the members' settled picks.
 *
 * "We never ask for a card" rather than "nothing to deposit": cold
 * landing pages get the plain wording, because the flagged vocabulary
 * scores the same whether it affirms or denies.
 */
function SquadsIntro() {
  return (
    <div className="legal">
      <h1 className="page-title">Squads</h1>
      <p className="legal-sub">Your group, in a room of its own.</p>

      <p style={{ fontSize: 14, lineHeight: 1.6 }}>
        Everyone in the group chat has an opinion every weekend and nobody
        writes any of it down. A squad is that group with a room of its own
        and a table that keeps itself.
      </p>

      <ul className="welcome-points" style={{ marginTop: 18 }}>
        <li><strong>Members only.</strong> What&apos;s said in the room stays in
          the room — nobody outside it can read a word.</li>
        <li><strong>The final score settles it.</strong> Everyone&apos;s picks
          are graded from the scoreboard. Nobody grades their own, and nothing
          can be edited once a game starts.</li>
        <li><strong>The table sorts itself.</strong> No more arguing about who
          called what in October.</li>
      </ul>

      <p style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <Link href="/signup?next=/squads/new" className="btn">Start a squad</Link>
        <Link href="/login?next=/squads" className="btn secondary">Log in</Link>
      </p>

      <p className="rec-foot">
        Free to join and we never ask for a card. We&apos;re not a sportsbook
        and don&apos;t take bets. <Link href="/help" className="help-link">How it works</Link>
      </p>
    </div>
  )
}
