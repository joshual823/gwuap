import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import VentComposer from './VentComposer'
import VentActions from './VentActions'

export const dynamic = 'force-dynamic'

export default async function VentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Signed-in only. People say hard things here; it shouldn't be
  // readable by anyone who wanders past, or indexable.
  if (!user) redirect('/login?next=/vent')

  const { data } = await supabase
    .from('vent_messages')
    .select(`
      id, body, created_at,
      author:profiles!vent_messages_author_id_fkey ( id, username, avatar_url )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const messages = (data ?? []) as any[]

  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Vent</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 14 }}>
        For the bad nights. Nothing posted here touches your record, the
        leaderboard, or anyone's win rate.
      </p>

      <div className="vent-help">
        <strong>If the betting has stopped being fun, help is free and confidential.</strong>
        <ul>
          <li>
            <strong>National Problem Gambling Helpline</strong> — call or text{' '}
            <a href="tel:18005224700">1-800-522-4700</a>. 24/7, all 50 states.
          </li>
          <li>
            Chat online at{' '}
            <a href="https://www.ncpgambling.org/chat" target="_blank" rel="noopener noreferrer">
              ncpgambling.org/chat
            </a>
          </li>
          <li>
            If you're thinking about harming yourself, call or text{' '}
            <a href="tel:988">988</a> — the Suicide &amp; Crisis Lifeline.
          </li>
        </ul>
        <span className="vent-help-note">US resources. More will be added as the site grows.</span>
      </div>

      <div className="vent-rules">
        <strong>Room rules</strong>
        <ol>
          <li>No bullying. You can be permanently banned for it.</li>
          <li>No racism, hate speech, or slurs of any kind.</li>
        </ol>
        <span className="vent-help-note">
          Reports from this room go straight to the top of the moderation queue.
        </span>
      </div>

      <VentComposer userId={user.id} />

      {messages.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>Nothing here yet.</p>
      )}

      {messages.map(m => (
        <article className="vent-msg" key={m.id}>
          <Link href={`/profile/${m.author?.username}`}>
            <Avatar url={m.author?.avatar_url} size={30} />
          </Link>
          <div className="vent-body">
            <div className="comment-head">
              <Link href={`/profile/${m.author?.username}`} className="uname">@{m.author?.username}</Link>
              <span className="dot">·</span>
              <span className="time">{timeAgo(m.created_at)}</span>
              <VentActions messageId={m.id} authorId={m.author?.id} viewerId={user.id} />
            </div>
            <p className="comment-text">{m.body}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
