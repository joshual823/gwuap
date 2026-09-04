import Link from 'next/link'
import { SITE_NAME, SUPPORT_EMAIL } from '@/lib/brand'
import { CONTEST } from '@/lib/contest'

export const metadata = {
  title: `How ${SITE_NAME} works`,
  description:
    'Post picks for free. The final score grades them — no self-reporting, no editing a record after the fact.',
}

export default function HelpPage() {
  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="page-title">How it works</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 20 }}>
        Everyone says they went 4-1 last week. Here, nobody has to take your
        word for it — or you theirs.
      </p>

      <div className="help-card">
        <h2>Posting a pick</h2>
        <p>
          Free, and no money is involved anywhere on the site. Open a game,
          tap a line, and it&apos;s posted. The dollar figures are for scoring
          only — nothing is deposited, staked or paid out.
        </p>
      </div>

      <div className="help-card">
        <h2>It grades itself</h2>
        <p>
          When the game finishes, the final score settles your pick. Nobody
          marks their own homework, including us — the buttons to do that
          don&apos;t exist, and the database refuses the change.
        </p>
        <p>
          Grading runs every hour. A pick on an evening game is usually
          settled before you next open the app.
        </p>
      </div>

      <div className="help-card">
        <h2>A pick locks at kick-off</h2>
        <p>
          Change your mind before the game starts and you can delete it.
          Once it&apos;s under way you can&apos;t, and once it&apos;s graded it&apos;s
          permanent. Otherwise anyone could post ten picks, bin the losers,
          and call it a record.
        </p>
      </div>

      <div className="help-card">
        <h2>Where the odds come from</h2>
        <p>
          Tap a price on a game page and it&apos;s the one a book was showing at
          that moment — that&apos;s what counts toward profit and the
          leaderboard. Type your own and the pick still settles as a win or
          a loss, but the money is yours alone unless you choose to show it,
          and it&apos;s marked <strong>self-reported</strong> when you do.
        </p>
      </div>

      <div className="help-card">
        <h2>What can&apos;t be graded</h2>
        <p>
          A scoreline settles moneylines, spreads, totals, first-inning,
          first-five and first-half picks. It can&apos;t settle a player prop, a
          parlay or a future — there&apos;s nothing to check them against — so
          those stay open and don&apos;t count toward your record. Post them
          anyway; they just aren&apos;t ranked.
        </p>
        <p>
          If something should have graded and didn&apos;t, it goes to a review
          queue and a human settles it. You&apos;ll see <em>under review</em> on
          the pick, with the reason.
        </p>
      </div>

      <div className="help-card">
        <h2>The leaderboard</h2>
        <p>
          Win rate over the last 30 days, minimum five settled picks. Only
          picks tied to a real fixture count. It&apos;s the whole point of the
          site: a record you couldn&apos;t have faked.
        </p>
        <Link href="/contest" className="help-link">
          The ${CONTEST.prize.toLocaleString()} launch contest →
        </Link>
      </div>

      <div className="help-card">
        <h2>Something wrong?</h2>
        <p>
          A pick graded incorrectly, a game missing, anything else — email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Gwuap%20support`} className="help-link">
            {SUPPORT_EMAIL}
          </a>
          . If it&apos;s about a specific pick, send the link to it and it&apos;ll be
          much quicker to sort out.
        </p>
      </div>
    </div>
  )
}
