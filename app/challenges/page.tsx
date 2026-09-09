import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { resultOf, resultLabel, type PickStatus } from '@/lib/challenge'
import { timeAgo } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Challenges' }

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/challenges')

  const { data } = await supabase
    .from('challenges')
    .select(`
      code, challenger_id, challenger_post_id, opponent_id, opponent_post_id,
      game_league, created_at,
      challenger:profiles!challenges_challenger_id_fkey ( username ),
      opponent:profiles!challenges_opponent_id_fkey ( username )
    `)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as any[]
  const ids = rows.flatMap(r => [r.challenger_post_id, r.opponent_post_id]).filter(Boolean)
  const { data: posts } = ids.length
    ? await supabase.from('posts').select('id, status').in('id', ids)
    : { data: [] }
  const status = new Map((posts ?? []).map((p: any) => [p.id, p.status as PickStatus]))

  return (
    <div style={{ marginTop: 24 }}>
      <div className="squad-head">
        <h1 className="display" style={{ fontSize: 22 }}>Challenges</h1>
        <Link href="/challenge/new" className="btn">New one</Link>
      </div>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, margin: '4px 0 18px' }}>
        One market, two sides, settled by the final score. Send one to somebody
        who isn&apos;t here yet — they only need the link.
      </p>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
          None yet. Take a side and send the link to whoever swears they had it.
        </p>
      ) : (
        <div className="squad-list">
          {rows.map(r => {
            const isChallenger = r.challenger_id === user.id
            const other = isChallenger ? r.opponent?.username : r.challenger?.username
            const result = r.opponent_id
              ? resultOf(status.get(r.challenger_post_id) ?? 'pending',
                         status.get(r.opponent_post_id) ?? 'pending')
              : 'pending'
            return (
              <Link href={`/c/${r.code}`} className="squad-card" key={r.code}>
                <div className="squad-card-top">
                  <span className="squad-name">
                    {other ? `vs @${other}` : 'Waiting for someone'}
                  </span>
                  {!r.opponent_id && <span className="squad-badge">Open</span>}
                </div>
                <p className="squad-desc">
                  {r.game_league} · {r.opponent_id ? resultLabel(result, isChallenger) : 'Nobody has taken it yet'}
                </p>
                <span className="squad-meta mono">{timeAgo(r.created_at)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
