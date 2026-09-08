import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { timeAgo } from '@/lib/time'
import { pickSummary } from '@/lib/odds'
import MarkAllRead from './MarkAllRead'

export const dynamic = 'force-dynamic'

function describe(n: any): string {
  switch (n.type) {
    case 'reaction': return n.comment_id ? 'reacted to your comment' : 'reacted to your post'
    case 'comment': return 'commented on your post'
    case 'reply': return 'replied to you'
    case 'follow': return 'followed you'
    case 'dm_request': return 'wants to message you'
    case 'dm_message': return 'sent you a message'
    case 'repost': return 'reposted your pick'
    default: return 'did something'
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/notifications')

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id, type, outcome, post_id, comment_id, conversation_id, emoji, read_at, created_at,
      actor:profiles!notifications_actor_id_fkey ( username )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as any[]

  // Which pick was graded. Its own query, following the rule the rest of
  // the app learned the hard way: the select above is what decides
  // whether this page renders at all, and folding a column into it
  // breaks the page until the migration runs. A failure here costs the
  // summary line and nothing else.
  const pickIds = [...new Set(
    rows.filter(n => n.type === 'graded' && n.post_id).map(n => n.post_id),
  )] as string[]
  const picks = new Map<string, any>()
  if (pickIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts').select('id, tag, tag2, sentiment, bet_type, line').in('id', pickIds)
    for (const p of posts ?? []) picks.set(p.id, p)
  }
  // A failed query and an empty inbox used to render identically, which
  // makes a broken notification system look like a quiet one.
  if (error) {
    return (
      <div style={{ marginTop: 24 }}>
        <h1 className="display" style={{ fontSize: 22 }}>Notifications</h1>
        <p style={{ color: 'var(--bear)', fontSize: 14, marginTop: 12 }}>
          Couldn't load notifications: {error.message}
        </p>
      </div>
    )
  }
  const unread = rows.filter(n => !n.read_at).length

  return (
    <div style={{ marginTop: 24 }}>
      <MarkAllRead userId={user.id} unreadCount={unread} />
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Notifications</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 12 }}>
        Reactions, comments, replies and new followers.
      </p>

      {rows.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
          Nothing yet. When someone reacts to a post, replies to you, or follows you, it shows up here.
        </p>
      )}

      {rows.map(n => {
        const href = n.conversation_id
          ? `/messages/${n.conversation_id}`
          : n.post_id
            ? `/post/${n.post_id}`
            : `/profile/${n.actor?.username}`
        const summary = n.type === 'graded' ? pickSummary(picks.get(n.post_id) ?? {}) : null
        return (
          <Link href={href} key={n.id} className={`notif ${n.read_at ? '' : 'unread'}`}>
            <span className="notif-icon">
              {n.type === 'graded' ? (n.outcome === 'win' ? '✅' : n.outcome === 'loss' ? '❌' : '➖')
                : n.type === 'reaction' ? (n.emoji || '♥')
                : n.type === 'follow' ? '👤'
                : n.type === 'repost' ? '🔁'
                : n.type.startsWith('dm_') ? '✉️' : '💬'}
            </span>
            <span className="notif-text">
              {n.type === 'graded' ? (
                <>
                  Your pick <strong>{n.outcome === 'win' ? 'won'
                    : n.outcome === 'loss' ? 'lost'
                    : n.outcome === 'push' ? 'pushed' : 'was settled'}</strong>
                  {/* Which one. Four picks on a Sunday and the row above
                      is unreadable without it. */}
                  {summary && <span className="notif-pick">{summary}</span>}
                </>
              ) : (
                <><strong>@{n.actor?.username ?? 'someone'}</strong> {describe(n)}</>
              )}
            </span>
            <span className="notif-time">{timeAgo(n.created_at)}</span>
          </Link>
        )
      })}
    </div>
  )
}
