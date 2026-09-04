import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { CONTEST, deadlineLabel, hasEnded, isClosingSoon } from '@/lib/contest'
import { SITE_NAME } from '@/lib/brand'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: `$${CONTEST.prize.toLocaleString()} launch contest — ${SITE_NAME}`,
  description: `Best record by ${CONTEST.endsLabel} wins $${CONTEST.prize.toLocaleString()}. Free to enter. Every pick is graded from the final score.`,
}

export default async function ContestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: board } = await supabase
    .from('leaderboard')
    .select('user_id, username, avatar_url, wins, losses, win_pct')
    .limit(5)

  const ended = hasEnded()

  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="page-title" style={{ marginBottom: 4 }}>
        ${CONTEST.prize.toLocaleString()} launch contest
      </h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 18 }}>
        Top three records by {CONTEST.endsLabel} share it.
        {isClosingSoon() && <strong style={{ color: 'var(--pending)' }}> {deadlineLabel()}.</strong>}
      </p>

      <div className="contest-card">
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>How it works</h2>
        <ol className="contest-rules">
          <li>Post picks on games — moneyline, spread or total.</li>
          <li>
            When the game finishes, the final score grades your pick. Nobody
            marks their own homework, including us.
          </li>
          <li>
            {CONTEST.minPicks} graded picks gets you on the leaderboard. The top
            three win rates on {CONTEST.endsLabel} share ${CONTEST.prize.toLocaleString()}:{' '}
            {CONTEST.payouts.map((p, i) => `${['1st', '2nd', '3rd'][i]} $${p}`).join(' · ')}.
          </li>
        </ol>
      </div>

      <div className="contest-card">
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>The rules, plainly</h2>
        <ul className="contest-rules">
          <li><strong>Free to enter.</strong> No deposit, no purchase, no stake at risk. The dollar figures on picks are for scoring only — no real money changes hands on this site.</li>
          <li><strong>It&apos;s a skill contest.</strong> You&apos;re ranked on how well you predict results, not on chance.</li>
          <li><strong>Ties</strong> go to whoever has more graded picks. Still tied, that place&apos;s prize is split between them.</li>
          <li><strong>{CONTEST.minPicks} graded picks minimum.</strong> Props, parlays and futures can&apos;t be settled from a scoreline, so they don&apos;t count toward your record.</li>
          <li><strong>One account per person.</strong> Duplicate accounts are disqualified, and the leaderboard is machine-graded so records can&apos;t be edited after the fact.</li>
          <li><strong>18+.</strong> Paid by whatever method suits the winner.</li>
        </ul>
      </div>

      <h2 className="comments-heading" style={{ marginTop: 22 }}>
        {ended ? 'Final standings' : 'Standing right now'}
      </h2>

      {(board ?? []).length === 0 ? (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
          Nobody has qualified yet. {CONTEST.minPicks} graded picks and you&apos;re
          top of the board.
        </p>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '2px 14px' }}>
          {(board ?? []).map((r: any, i: number) => (
            <Link href={`/profile/${r.username}`} key={r.user_id} className="lb-row">
              <span className={`lb-rank ${i < 3 ? 'top3' : ''}`}>{i + 1}</span>
              <Avatar url={r.avatar_url} size={30} />
              <div className="lb-who">
                <span style={{ fontWeight: 600, fontSize: 14 }}>@{r.username}</span>
                <span className="lb-meta mono">{r.wins}-{r.losses}</span>
              </div>
              <span className="stat" style={{ color: 'var(--brand)', fontSize: 17, width: 54, textAlign: 'right' }}>
                {r.win_pct}%
              </span>
            </Link>
          ))}
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-dim)' }}>
        Not sure how the grading works?{' '}
        <Link href="/help" className="help-link">How it works</Link>
      </p>

      {!ended && (
        <Link href={user ? '/post/new' : '/signup'} className="btn" style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
          {user ? 'Post a pick' : 'Sign up and enter'}
        </Link>
      )}
    </div>
  )
}
