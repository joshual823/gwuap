import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { timeAgo } from '@/lib/time'
import { otherParticipant } from '@/lib/dm'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/messages')

  const [{ data: convos, error }, { data: unreadRows }] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        id, status, requested_by, last_message_at,
        a:profiles!conversations_user_a_fkey ( id, username, avatar_url ),
        b:profiles!conversations_user_b_fkey ( id, username, avatar_url ),
        messages ( body, created_at, sender_id )
      `)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false }),
    // RLS already limits this to conversations you're in.
    supabase.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', user.id),
  ])

  if (error) {
    return (
      <div style={{ marginTop: 24 }}>
        <h1 className="display" style={{ fontSize: 22 }}>Messages</h1>
        <p style={{ color: 'var(--bear)', fontSize: 14, marginTop: 12 }}>
          Couldn't load messages: {error.message}
        </p>
      </div>
    )
  }

  const unreadBy = new Map<string, number>()
  for (const row of (unreadRows ?? []) as any[]) {
    unreadBy.set(row.conversation_id, (unreadBy.get(row.conversation_id) ?? 0) + 1)
  }

  const rows = (convos ?? []) as any[]
  // A request you sent is not a request you have to answer.
  const requests = rows.filter(c => c.status === 'pending' && c.requested_by !== user.id)
  const threads = rows.filter(c => c.status === 'accepted')
  const sent = rows.filter(c => c.status === 'pending' && c.requested_by === user.id)

  function row(c: any, kind: 'thread' | 'request' | 'sent') {
    const other = otherParticipant(c.a, c.b, user!.id)
    const msgs = (c.messages ?? []) as any[]
    const last = msgs.length
      ? msgs.reduce((newest, m) => (m.created_at > newest.created_at ? m : newest))
      : null
    const unread = unreadBy.get(c.id) ?? 0
    return (
      <Link href={`/messages/${c.id}`} key={c.id} className={`dm-row ${unread ? 'unread' : ''}`}>
        <Avatar url={other?.avatar_url} size={38} name={other?.username} />
        <div className="dm-main">
          <div className="dm-head">
            <span className="uname">@{other?.username ?? 'someone'}</span>
            {last && <span className="time">{timeAgo(last.created_at)}</span>}
          </div>
          <div className="dm-preview">
            {kind === 'sent' && <span className="dm-tag">awaiting reply</span>}
            {last ? last.body : 'No messages yet'}
          </div>
        </div>
        {unread > 0 && <span className="count-badge dm-badge">{unread > 9 ? '9+' : unread}</span>}
      </Link>
    )
  }

  const empty = rows.length === 0

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Messages</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 12 }}>
        Nobody can message you until you accept their request.
      </p>

      {empty && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
          No messages yet. Open someone's profile and hit Message to start one.
        </p>
      )}

      {requests.length > 0 && <h2 className="comments-heading">Requests</h2>}
      {requests.map(c => row(c, 'request'))}

      {threads.length > 0 && <h2 className="comments-heading">Conversations</h2>}
      {threads.map(c => row(c, 'thread'))}

      {sent.length > 0 && <h2 className="comments-heading">Sent</h2>}
      {sent.map(c => row(c, 'sent'))}
    </div>
  )
}
