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
 * page as much as a page.
 *
 * The first version answered "what is this" thoroughly and "how do I
 * start" somewhere below the fold: a lead, a paragraph, three
 * full-sentence bullets, then the buttons. Everything on it was true and
 * it was still the wrong shape, because a stranger off an ad is deciding
 * whether to care, not studying. They give it a couple of seconds.
 *
 * So the order is inverted. One line says what it is, the button sits
 * directly under it, and three three-word steps say how it goes. The
 * detail didn't get deleted — it moved into a disclosure the curious can
 * open and everybody else never sees. Native <details>, so it works with
 * no JavaScript and reads correctly to a screen reader.
 *
 * Every claim is still one the room actually keeps: members-only is
 * enforced by RLS, the grading is the site's, and the leaderboard is
 * `standings` over the members' settled picks.
 *
 * It says **leaderboard**, not "table". "The table" is a football-league
 * word and this campaign runs at r/nfl, r/CFB, r/nba and r/mlb, where
 * "leaderboard" is the word people already own. The page also has about
 * two seconds to be understood, and a word the reader has to translate
 * spends most of them. The squad page itself was renamed to match — a
 * stranger who arrives on "leaderboard" and finds "The table" has to do
 * the translation anyway, one screen later.
 */
function SquadsIntro() {
  return (
    <div className="legal squads-intro">
      <h1 className="page-title">Squads</h1>
      <p className="squads-lead">
        Track your group&apos;s picks on a leaderboard that keeps itself.
      </p>

      {/* The front door, rebuilt 11 Sep after the pixel showed 22 people
          landing here and none signing up.

          It used to offer exactly two things: "Start a squad", which
          means naming one and recruiting your friends, and "Log in",
          which is for people who already have an account. So a stranger
          off an ad had one door that asked a lot and one that wasn't for
          them. The ad was deliberately built so the invite was *not* the
          ask — and then this page made it anyway, one screen later.

          The ladder now escalates after they're in, not before:
          signing up is one person's decision, and `next=/squads/new`
          means the intent survives it, so they still land on squad
          creation — having already committed something small.

          "Look around first" is the door that didn't exist. Somebody
          deciding whether this is worth an account could not, before
          this, see the thing working without making one. /feed is real
          picks being graded, which is the argument. */}
      <p className="squads-cta">
        <Link href="/signup?next=/squads/new" className="btn">Sign up free</Link>
        <Link href="/feed" className="btn secondary">Look around first</Link>
      </p>
      <p className="squads-micro">
        Free · we never ask for a card ·{' '}
        <Link href="/login?next=/squads" className="help-link">Log in</Link>
      </p>

      {/* The payoff, before the instructions. Telling somebody a
          leaderboard keeps itself is a sentence; showing them one is the
          product. Built from the same `rec-table` / `squad-board-row`
          classes the real leaderboard uses, so it isn't an artist's
          impression — it's the component, with sample rows in it.

          Labelled EXAMPLE and the first row is @you. This site's whole
          claim is that its numbers are real, so a fake leaderboard that
          could be mistaken for a live one would cost more than it buys. */}
      <figure className="squads-preview">
        <figcaption>
          Your squad&apos;s leaderboard <span className="squads-tag">example</span>
        </figcaption>
        <div className="rec-table">
          {/* Record and win rate, and deliberately no profit column.
              The real leaderboard has one and keeps it. Here it would
              read "@you  +$248" to a stranger who arrived from an ad,
              which is an implied earnings claim — the one thing the ad
              doctrine rules out flat ("no win rates, no implied edge, no
              money anyone could make"). The record is the product; the
              dollar figure is the part that sounds like a promise. */}
          {[
            { rank: 1, who: 'you', wl: '12-7', pct: '63%' },
            { rank: 2, who: 'dave', wl: '9-10', pct: '47%' },
            { rank: 3, who: 'marcus', wl: '4-11', pct: '27%' },
          ].map(r => (
            <div className="rec-row squad-board-row" key={r.who}>
              <span className="lb-rank">{r.rank}</span>
              <span className="rec-label squad-board-who">
                <Avatar url={null} size={22} name={r.who} />@{r.who}
              </span>
              <span className="rec-wl mono">{r.wl}</span>
              <span className="rec-pct mono">{r.pct}</span>
            </div>
          ))}
        </div>
      </figure>

      <ol className="squads-steps">
        <li><span className="squads-num">1</span> Start a squad</li>
        <li><span className="squads-num">2</span> Invite your group</li>
        <li><span className="squads-num">3</span> Post picks &mdash; the final score grades them</li>
      </ol>

      {/* "Bring your group" and not "import your Discord".
          There is no Discord integration and no Polymarket one, and this
          site's entire pitch is that it doesn't overstate itself — an ad
          promising an import that doesn't exist is the $300-contest
          mistake wearing a different hat. What is true is that wherever
          the group already talks, one link moves them, and that's the
          benefit the reader actually wanted. */}
      <p className="squads-bring">
        Already have a group on Discord, iMessage or anywhere else?
        One link brings them over.
      </p>

      {/* The long answer, for whoever wants it. Closed by default: the
          people who need it will open it, and the people who don't were
          never going to read it anyway. */}
      <details className="squads-more">
        <summary>What&apos;s a squad, exactly?</summary>
        <p>
          <strong>Members only.</strong> What&apos;s said in the room stays in
          the room — nobody outside it can read a word.
        </p>
        <p>
          <strong>Nobody grades their own.</strong> Everyone&apos;s picks are
          settled from the final score, and nothing can be edited once a game
          starts. That&apos;s what makes the table worth arguing about.
        </p>
        <p>
          <strong>No money involved.</strong> We&apos;re not a sportsbook and
          don&apos;t take bets. <Link href="/help" className="help-link">How it works</Link>
        </p>
      </details>
    </div>
  )
}
