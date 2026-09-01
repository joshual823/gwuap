import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import AdminActions from './AdminActions'

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
      id, reason, status, created_at,
      reporter:profiles!reports_reporter_id_fkey ( username ),
      reported_user:profiles!reports_reported_user_id_fkey ( id, username ),
      reported_post:posts ( id, caption )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>Moderation queue</h1>
      {(reports ?? []).length === 0 && <p style={{ color: 'var(--ink-dim)' }}>No open reports.</p>}
      {(reports ?? []).map((r: any) => (
        <div key={r.id} className="ticket">
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>@{r.reporter?.username}</strong> reported <strong>@{r.reported_user?.username}</strong>
          </p>
          <p style={{ margin: '6px 0', color: 'var(--ink-dim)', fontSize: 13 }}>{r.reason}</p>
          {r.reported_post?.caption && (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-dim)' }}>"{r.reported_post.caption}"</p>
          )}
          <AdminActions reportId={r.id} userId={r.reported_user?.id} postId={r.reported_post?.id} />
        </div>
      ))}
    </div>
  )
}
