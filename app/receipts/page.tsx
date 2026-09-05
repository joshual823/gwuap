import { SITE_NAME } from '@/lib/brand'

export const metadata = {
  title: 'Receipts card',
  // Marketing material, not a page for visitors to land on.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Where the daily card is picked up.
 *
 * Unlisted rather than admin-gated: it shows nothing that isn't already
 * public on the feed, and needing to be logged in on whichever phone is
 * to hand is friction for something meant to take twenty seconds.
 */
export default function ReceiptsPage() {
  return (
    <div className="legal">
      <h1 className="page-title">Today&apos;s receipts</h1>
      <p className="legal-sub">
        Every pick the scoreboard settled in the last 36 hours, wins and losses
        both. Save it and post it — it regenerates each time this page loads.
      </p>

      <img
        src="/api/receipts"
        alt="Picks graded in the last 36 hours"
        style={{
          width: '100%', borderRadius: 14, border: '1px solid var(--line)',
          display: 'block', marginBottom: 18,
        }}
      />

      <h2>Saving it</h2>
      <p>
        Long-press the image on a phone, or right-click on a computer, and choose
        to save. It&apos;s 1080×1080 — square, which is what X and Instagram both
        want.
      </p>

      <h2>Posting it</h2>
      <p>
        Post it as an image with no link in the post itself. X charges more for
        posts carrying a link and then shows them to fewer people, so put{' '}
        gwuap.co in your bio and in a reply instead.
      </p>
      <p>
        Something like: <em>Every pick on {SITE_NAME} is graded from the final
        score. Nobody edits their own record. Here&apos;s today, losses
        included.</em>
      </p>
      <p>
        The losses are the point. Everyone claims 70% — showing the ones that
        missed is the only version anybody believes.
      </p>
    </div>
  )
}
