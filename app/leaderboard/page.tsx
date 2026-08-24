import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const supabase = createClient()
  // Queries the "leaderboard" SQL view defined in supabase/schema.sql
  const { data: rows } = await supabase.from('leaderboard').select('*').limit(50)

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22 }}>Leaderboard</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 16 }}>
        Win rate over the last 30 days · minimum 5 graded picks
      </p>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '2px 14px' }}>
        {(rows ?? []).map((r: any, i: number) => (
          <Link href={`/profile/${r.username}`} key={r.user_id} className="lb-row">
            <span className={`lb-rank ${i < 3 ? 'top3' : ''}`}>{i + 1}</span>
            <div className="avatar" style={{ width: 30, height: 30 }} />
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>@{r.username}</span>
            <span className="record" style={{ fontSize: 15, color: 'var(--ink-dim)' }}>{r.wins}-{r.losses}</span>
            <span className="stat" style={{ color: 'var(--brand)', fontSize: 18, width: 56, textAlign: 'right' }}>
              {r.win_pct}%
            </span>
          </Link>
        ))}
        {(!rows || rows.length === 0) && (
          <p style={{ color: 'var(--ink-dim)', padding: '16px 0' }}>No qualifying records yet — post and grade at least 5 picks to appear here.</p>
        )}
      </div>
    </div>
  )
}
