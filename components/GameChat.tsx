'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import MentionInput from '@/components/MentionInput'
import { REACTION_EMOJI } from '@/lib/reactions'
import RichText from '@/components/RichText'
import ChatActions from '@/components/ChatActions'

type Author = { id: string; username: string; avatar_url: string | null }
type Msg = { id: string; body: string; created_at: string; author: Author | null }

const MAX = 500

/**
 * Chat attached to a single game. The room key is the league and ESPN
 * event id, so it exists as soon as someone speaks — no seeding, and it
 * disappears from view when the game does.
 */
export default function GameChat({ gameKey, viewerId }: {
  gameKey: string
  viewerId: string | null
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [present, setPresent] = useState(1)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authors = useRef(new Map<string, Author | null>())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase
      .from('game_messages')
      .select('id, body, created_at, author:profiles!game_messages_author_id_fkey ( id, username, avatar_url )')
      .eq('game_key', gameKey)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!active) return
        const rows = (data ?? []) as unknown as Msg[]
        rows.forEach(m => m.author && authors.current.set(m.author.id, m.author))
        setMessages(rows)
      })

    const channel = supabase
      .channel(`game:${gameKey}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_key=eq.${gameKey}` },
        async payload => {
          const row = payload.new as { id: string; body: string; created_at: string; author_id: string }
          let author = authors.current.get(row.author_id) ?? null
          if (!author) {
            const { data } = await supabase.from('profiles')
              .select('id, username, avatar_url').eq('id', row.author_id).maybeSingle()
            author = (data as Author) ?? null
            if (author) authors.current.set(row.author_id, author)
          }
          setMessages(cur => cur.some(m => m.id === row.id)
            ? cur
            : [...cur, { id: row.id, body: row.body, created_at: row.created_at, author }])
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_messages' },
        payload => setMessages(cur => cur.filter(m => m.id !== (payload.old as any).id)))
      .on('presence', { event: 'sync' }, () => {
        setPresent(Object.keys(channel.presenceState()).length || 1)
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') channel.track({ at: gameKey }) })

    return () => { active = false; supabase.removeChannel(channel) }
  }, [gameKey])

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || !viewerId) return
    setSending(true); setError(null)
    const supabase = createClient()
    const { error: sendError } = await supabase
      .from('game_messages').insert({ game_key: gameKey, author_id: viewerId, body: text })
    setSending(false)
    if (sendError) { setError(sendError.message); return }
    setBody('')
  }

  return (
    <div className="gc">
      <div className="gc-presence">
        <span className={`vent-dot ${present > 1 ? 'live' : ''}`} />
        {present > 1 ? `${present} here` : "You're first in here"}
      </div>

      <div className="gc-stream">
        {messages.length === 0 && (
          <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
            Nothing said yet. Start it.
          </p>
        )}
        {messages.map(m => (
          <div className="gc-msg" key={m.id}>
            <Link href={`/profile/${m.author?.username}`}>
              <Avatar url={m.author?.avatar_url} size={26} name={m.author?.username} />
            </Link>
            <div className="gc-body">
              <div className="gc-head">
                <Link href={`/profile/${m.author?.username}`} className="uname">@{m.author?.username}</Link>
                <span className="time">{timeAgo(m.created_at)}</span>
                {/* Signed-out readers get no controls: there is nothing
                    they could do with them, and a report needs a reporter. */}
                {m.author?.id && viewerId && (
                  <ChatActions messageId={m.id} authorId={m.author.id} viewerId={viewerId} />
                )}
              </div>
              <RichText text={m.body} className="gc-text" />
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {viewerId ? (
        <form onSubmit={send} className="gc-form">
          <MentionInput rows={2} maxLength={MAX} value={body} onChange={setBody}
            placeholder="Say something…" />
          <div className="comment-form-foot">
            {/* One tap for the things people actually send in a game thread. */}
            <div className="gc-quick">
              {REACTION_EMOJI.slice(0, 6).map(e => (
                <button key={e} type="button" className="gc-quick-btn"
                  aria-label={`Add ${e}`}
                  onClick={() => setBody(b => (b + e).slice(0, MAX))}>{e}</button>
              ))}
            </div>
            <span className="comment-count-left">
              {MAX - body.length < 100 ? `${MAX - body.length} left` : ''}
            </span>
            <button className="btn" type="submit" disabled={sending || !body.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
        </form>
      ) : (
        <p className="comment-signin">
          <Link href="/login" className="comment-signin-link">Log in</Link> to join the chat.
        </p>
      )}
    </div>
  )
}
