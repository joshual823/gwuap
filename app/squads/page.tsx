import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabaseServer'
import { FOUNDING_LIMIT } from '@/lib/badges'
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
async function SquadsIntro() {
  const supabase = await createClient()

  // Real numbers, not a claim. The old page's only demonstration was a
  // leaderboard labelled "example" — honest, and therefore an admission
  // that nothing on the page was real, while ninety genuinely graded
  // picks sat in the database unshown.
  const [{ data: settled }, { count: accounts }] = await Promise.all([
    supabase.from('posts')
      .select('ticker, status, created_at')
      .eq('post_kind', 'pick')
      .in('status', ['win', 'loss', 'push'])
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const rows = settled ?? []
  const won = rows.filter(r => r.status === 'win').length
  const lost = rows.filter(r => r.status === 'loss').length
  const pushed = rows.filter(r => r.status === 'push').length
  const recent = rows.slice(0, 3)
  const placesLeft = accounts == null ? null : FOUNDING_LIMIT - accounts

  return (
    <div className="legal squads-intro">
      {/* What this is, before any claim about it.
          This sat below the call to action until 13 Sep, on the reasoning
          that a brand line at the top is clutter. Josh looked at the
          built page and said it read as confusing, and he's right: the
          headline was "Keep a record that isn't yours to edit", which is
          an argument for a product the reader hasn't been told the shape
          of yet. Name and category first, then the pitch. */}
      <h1 className="page-title squads-h1">
        Gwuap — the social media website for sports fans
      </h1>
      <p className="squads-lead">
        Track your picks, chat with sports fans, and start your own personal squad.
      </p>

      {/* "Join the new wave" over "Post your first pick".
          The concrete version names a task, and this page's whole problem
          was that the ask felt like work. This one sells being early,
          which is the honest advantage of a site with eight accounts —
          and it's backed below by the founding count rather than left as
          atmosphere, because a claim to momentum with nothing behind it
          is exactly the overstatement this site doesn't do. */}
      <p className="squads-cta">
        <Link href="/signup?next=/post/new" className="btn">Join the new wave</Link>
        <Link href="/feed" className="btn secondary">Look around first</Link>
      </p>
      <p className="squads-micro">
        Free · we never ask for a card ·{' '}
        <Link href="/login?next=/feed" className="help-link">Log in</Link>
      </p>
      {placesLeft !== null && placesLeft > 0 && (
        <p className="squads-founding">
          <strong>{placesLeft} of {FOUNDING_LIMIT} founding places left.</strong>{' '}
          The first {FOUNDING_LIMIT} accounts keep the badge for good.
        </p>
      )}

      <section className="squads-block">
        <h2 className="squads-h2">Track your picks</h2>
        {/* Three lines, not a paragraph. Josh's structure — the previous
            version said the same thing in fifty words and the whole
            problem with this page has been asking for more reading than
            it has earned. */}
        <ol className="squads-how">
          <li><span className="squads-num">1</span> Post a pick</li>
          <li><span className="squads-num">2</span> It&apos;s graded a win, loss or push</li>
          <li><span className="squads-num">3</span> Counts towards your record</li>
        </ol>

        {/* The proof, and it is deliberately not flattering. A near-even
            record is the strongest thing this page can say: it shows the
            grader isn't on the site's side. A page selling an edge would
            bury the losses; this one is selling that the number can't be
            fiddled, and 43-42 makes that case better than 43-2 ever could. */}
        {rows.length > 0 && (
          <figure className="squads-proof">
            <p className="squads-proof-head">
              <strong>{rows.length}</strong> picks graded so far
            </p>
            <p className="squads-proof-tally">
              <span className="sp-win">{won} won</span>
              <span className="sp-loss">{lost} lost</span>
              {pushed > 0 && <span className="sp-push">{pushed} pushed</span>}
            </p>
            <p className="squads-proof-note">
              We show the losses because a record you can edit isn&apos;t a record.
            </p>
            {recent.length > 0 && (
              <ul className="squads-proof-recent">
                {recent.map((r, i) => (
                  <li key={i}>
                    <span className="mono">{r.ticker}</span>
                    <span className={`stamp ${r.status}`}>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </figure>
        )}
      </section>

      {/* Squads: what you grow into once you have a record worth putting
          on a table, rather than the entry fee. */}
      <section className="squads-block">
        <h2 className="squads-h2">Then bring your group</h2>
        <p>Have a group chat? Invite them to create your own squad.</p>

        {/* The mock leaderboard this replaces was labelled "example" and
            therefore an admission that nothing on the page was real. The
            proof block above is now the real version of that job, so the
            squad section can be an illustration instead of a claim.

            The source image arrived covered in cash stacks, money bags
            and $-eyes emoji. Cropped and the edges darkened to clear all
            of it: this page's ad carries the line "no betting, no money",
            Reddit's first rejection cited the landing page, and a page
            decorated with money is the exact signal that pulls an ad. */}
        <figure className="squads-illus">
          <Image
            src="/squad-chat.png" alt="" width={700} height={655}
            sizes="(max-width: 460px) 100vw, 460px" priority={false}
          />
        </figure>

        <p className="squads-bring">
          One link brings them over.{' '}
          <Link href="/signup?next=/squads/new" className="help-link">Start a squad</Link>
        </p>
      </section>

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
