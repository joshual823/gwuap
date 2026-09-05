import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { timeAgo } from '@/lib/time'
import { otherParticipant } from '@/lib/dm'
import Avatar from '@/components/Avatar'
import MessageComposer from './MessageComposer'
import RequestActions from './RequestActions'
import MarkRead from './MarkRead'

export const dynamic = 'force-dynamic'

export default async function ThreadPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/messages/${params.id}`)

  const { data: convo } = await supabase
    .from('conversations')
    .select(`
      id, status, requested_by, user_a, user_b,
      a:profiles!conversations_user_a_fkey ( id, username, avatar_url ),
      b:profiles!conversations_user_b_fkey ( id, username, avatar_url )
    `)
    .eq('id', params.id)
    .maybeSingle()

  // RLS hides conversations you're not in, so "not found" covers both.
  if (!convo) notFound()

  const c = convo as any
  const other = otherParticipant(c.a, c.b, user.id)

  const { data: messageRows } = await supabase
    .from('messages')
    .select('id, body, sender_id, created_at, read_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })

  const messages = (messageRows ?? []) as any[]
  const unread = messages.filter(m => m.sender_id !== user.id && !m.read_at).length

  const isRecipient = c.requested_by !== user.id
  const awaitingMe = c.status === 'pending' && isRecipient
  const awaitingThem = c.status === 'pending' && !isRecipient

  let composerBlockedReason: string | null = null
  if (c.status === 'declined') composerBlockedReason = 'This conversation is closed.'
  else if (awaitingMe) composerBlockedReason = 'Accept the request to reply.'

  return (
    <div style={{ marginTop: 16 }}>
      <MarkRead conversationId={c.id} userId={user.id} unreadCount={unread} />
      <Link href="/messages" className="back-link">← Messages</Link>

      <div className="dm-header">
        <Avatar url={other?.avatar_url} size={38} name={other?.username} />
        <Link href={`/profile/${other?.username}`} className="uname" style={{ fontSize: 16 }}>
          @{other?.username ?? 'someone'}
        </Link>
      </div>

      {awaitingMe && (
        <RequestActions conversationId={c.id} fromUsername={other?.username ?? 'someone'} />
      )}

      <div className="dm-thread">
        {messages.length === 0 && (
          <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>No messages yet.</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`dm-msg ${m.sender_id === user.id ? 'mine' : ''}`}>
            <div className="dm-bubble">{m.body}</div>
            <span className="dm-msg-time">{timeAgo(m.created_at)}</span>
          </div>
        ))}
      </div>

      {awaitingThem && (
        <p className="dm-disabled">
          Request sent. They'll see it in their requests, and can reply once they accept.
        </p>
      )}

      <MessageComposer
        conversationId={c.id}
        disabled={composerBlockedReason}
        placeholder={awaitingThem ? 'Add to your request…' : 'Write a message…'}
      />
    </div>
  )
}
