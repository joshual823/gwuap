import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { CONTEST, deadlineLabel, hasEnded } from '@/lib/contest'

/**
 * The pitch to a logged-out visitor.
 *
 * It leads with whatever is currently hardest to argue with. While the
 * board is empty that's the fact that nobody has qualified — five graded
 * picks and you're first, which is a real and reachable claim rather
 * than a slogan. Once someone leads it becomes the record to beat, which
 * is better still: a concrete target beats an invitation.
 */
export default async function ContestBanner() {
  if (hasEnded()) return null

  const supabase = await createClient()
  const { data: top } = await supabase
    .from('leaderboard')
    .select('username, wins, losses, win_pct')
    .limit(1)

  const leader = top?.[0]

  return (
    <Link href="/contest" className="contest-banner">
      <span className="contest-prize">${CONTEST.prize.toLocaleString()}</span>
      <span className="contest-copy">
        {leader
          ? <>Beat <strong>@{leader.username}</strong> — {leader.wins}-{leader.losses}, {leader.win_pct}%</>
          : <>Nobody has qualified yet. {CONTEST.minPicks} graded picks puts you first.</>}
      </span>
      <span className="contest-when">{deadlineLabel()}</span>
    </Link>
  )
}
