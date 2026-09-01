import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import { formatSignedUsd } from '@/lib/odds'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  // Queries the "leaderboard" SQL view defined in supabase/schema.sql
  const { data: rows } = await supabase.from('leaderboard').select('*').limit(50)

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22 }}>Leaderboard</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 16 }}>
        Win rate and profit over the last 30 days · minimum 5 graded picks ·
        at least 80% of settled picks graded
      </p>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '2px 14px' }}>
        {(rows ?? []).map((r: any, i: number) => {
          const profit = Number(r.total_profit ?? 0)
          return (
            <Link href={`/profile/${r.username}`} key={r.user_id} className="lb-row">
              <span className={`lb-rank ${i < 3 ? 'top3' : ''}`}>{i + 1}</span>
              <Avatar url={r.avatar_url} size={30} />
              <div className="lb-who">
                <span style={{ fontWeight: 600, fontSize: 14 }}>@{r.username}</span>
                <span className="lb-meta mono">
                  <span>{r.wins}-{r.losses}</span>
                  <span className="dot">·</span>
                  <span className={`amt ${profit >= 0 ? 'pos' : 'neg'}`}>{formatSignedUsd(profit)}</span>
                  {Number(r.ungraded ?? 0) > 0 && (
                    <>
                      <span className="dot">·</span>
                      <span style={{ color: 'var(--pending)' }}>{r.ungraded} ungraded</span>
                    </>
                  )}
                </span>
              </div>
              <span className="stat" style={{ color: 'var(--brand)', fontSize: 18, width: 56, textAlign: 'right' }}>
                {r.win_pct}%
              </span>
            </Link>
          )
        })}
        {(!rows || rows.length === 0) && (
          <p style={{ color: 'var(--ink-dim)', padding: '16px 0' }}>No qualifying records yet — post and grade at least 5 picks to appear here.</p>
        )}
      </div>
    </div>
  )
}
