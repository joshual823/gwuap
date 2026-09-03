import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import AdminActions from './AdminActions'
import GradeReview from './GradeReview'
import { BLOCKED_LABELS, type Blocked } from '@/lib/grade'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) {
    return <p style={{ marginTop: 40 }}>Not authorized.</p>
  }

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id, reason, status, created_at, reported_vent_id,
      reporter:profiles!reports_reporter_id_fkey ( username ),
      reported_user:profiles!reports_reported_user_id_fkey ( id, username ),
      reported_post:posts ( id, caption ),
      reported_vent:vent_messages ( id, body )
    `)
    .eq('status', 'open')
    // Vent reports first: it's the room where getting moderation wrong
    // matters most.
    .order('reported_vent_id', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Picks the grader refused and wrote a reason on. Not the same queue as
  // reports and deliberately above them: a stuck pick is somebody's
  // contest entry silently not counting.
  const { data: stuck } = await supabase
    .from('posts')
    .select(`
      id, caption, tag, tag2, bet_type, sentiment, odds, stake, line,
      game_league, game_id, grade_note, grade_checked_at, created_at,
      author:profiles!posts_author_id_fkey ( id, username )
    `)
    .eq('status', 'pending')
    .not('grade_note', 'is', null)
    .order('grade_checked_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Grading review</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 14 }}>
        Picks the scoreboard couldn&apos;t settle. Each one is a record that
        isn&apos;t counting until somebody decides it.
      </p>

      {(stuck ?? []).length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginBottom: 24 }}>
          Nothing waiting — everything gradeable has been graded.
        </p>
      )}

      {(stuck ?? []).map((p: any) => (
        <div key={p.id} className="ticket priority" style={{ marginBottom: 10 }}>
          <span className="ticket-flag">
            {BLOCKED_LABELS[p.grade_note as Blocked] ?? p.grade_note}
          </span>
          <p style={{ margin: '0 0 4px', fontSize: 14 }}>
            <strong>@{p.author?.username}</strong> · {p.bet_type} · {p.sentiment}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-dim)' }}>
            {p.tag}{p.tag2 ? ` vs ${p.tag2}` : ''}
            {p.line != null && ` · line ${p.line}`}
            {p.odds && ` · ${p.odds}`}
            {p.stake != null && ` · $${p.stake}`}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--ink-faint)' }}>
            {p.game_league && p.game_id
              ? <>Game: {p.game_league} #{p.game_id}</>
              : <>No game attached — can&apos;t be settled from a scoreboard at all.</>}
          </p>
          {p.caption && (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-dim)', margin: '0 0 4px' }}>
              &ldquo;{p.caption}&rdquo;
            </p>
          )}
          <GradeReview postId={p.id} isOwn={p.author?.id === user.id} />
        </div>
      ))}

      <h1 className="display" style={{ fontSize: 22, margin: '28px 0 16px' }}>Moderation queue</h1>
      {(reports ?? []).length === 0 && <p style={{ color: 'var(--ink-dim)' }}>No open reports.</p>}
      {(reports ?? []).map((r: any) => (
        <div key={r.id} className={`ticket ${r.reported_vent_id ? 'priority' : ''}`}>
          {r.reported_vent_id && <span className="ticket-flag">Vent room · priority</span>}
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>@{r.reporter?.username}</strong> reported <strong>@{r.reported_user?.username}</strong>
          </p>
          <p style={{ margin: '6px 0', color: 'var(--ink-dim)', fontSize: 13 }}>{r.reason}</p>
          {r.reported_post?.caption && (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-dim)' }}>"{r.reported_post.caption}"</p>
          )}
          {r.reported_vent?.body && (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-dim)' }}>"{r.reported_vent.body}"</p>
          )}
          <AdminActions reportId={r.id} userId={r.reported_user?.id} postId={r.reported_post?.id} />
        </div>
      ))}
    </div>
  )
}
