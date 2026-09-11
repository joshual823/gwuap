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
import ChatPick from '@/components/ChatPick'
import SharePickSheet from '@/components/SharePickSheet'
import { CHAT_PICK_COLUMNS, type ChatPick as Pick } from '@/lib/chatPick'

type Author = { id: string; username: string; avatar_url: string | null }
type Msg = {
  id: string; body: string; created_at: string; author: Author | null
  /** A pick shared into the room, read live so the card settles when it does. */
  pick?: Pick | null
}

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
  const [showPicks, setShowPicks] = useState(false)
  const authors = useRef(new Map<string, Author | null>())
  const picks = useRef(new Map<string, Pick | null>())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase
      .from('game_messages')
      .select(`id, body, created_at, author:profiles!game_messages_author_id_fkey ( id, username, avatar_url ), pick:posts!game_messages_post_id_fkey ( ${CHAT_PICK_COLUMNS} )`)
      .eq('game_key', gameKey)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!active) return
        const rows = (data ?? []) as unknown as Msg[]
        rows.forEach(m => {
          if (m.author) authors.current.set(m.author.id, m.author)
          if (m.pick) picks.current.set(m.pick.id, m.pick)
        })
        setMessages(rows)
      })

    const channel = supabase
      .channel(`game:${gameKey}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_key=eq.${gameKey}` },
        async payload => {
          const row = payload.new as {
            id: string; body: string; created_at: string; author_id: string; post_id: string | null
          }
          let author = authors.current.get(row.author_id) ?? null
          if (!author) {
            const { data } = await supabase.from('profiles')
              .select('id, username, avatar_url').eq('id', row.author_id).maybeSingle()
            author = (data as Author) ?? null
            if (author) authors.current.set(row.author_id, author)
          }
          // Realtime hands over the row, not the join, so a shared pick
          // has to be looked up — once per pick, not once per message.
          let pick: Pick | null = null
          if (row.post_id) {
            pick = picks.current.get(row.post_id) ?? null
            if (!pick) {
              const { data } = await supabase.from('posts')
                .select(CHAT_PICK_COLUMNS).eq('id', row.post_id).maybeSingle()
              pick = (data as unknown as Pick) ?? null
              if (pick) picks.current.set(row.post_id, pick)
            }
          }
          setMessages(cur => cur.some(m => m.id === row.id)
            ? cur
            : [...cur, { id: row.id, body: row.body, created_at: row.created_at, author, pick }])
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

  /** Words, a shared pick, or both — but never neither. */
  async function post(text: string, postId: string | null) {
    if (!viewerId) return
    const said = text.trim()
    if (!said && !postId) return
    setSending(true); setError(null)
    const supabase = createClient()
    const { error: sendError } = await supabase
      .from('game_messages')
      .insert({ game_key: gameKey, author_id: viewerId, body: said, post_id: postId })
    setSending(false)
    if (sendError) { setError(sendError.message); return }
    setBody('')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    await post(body, null)
  }

  return (
    <div className="gc">
      <div className="gc-presence">
        <span className={`vent-dot ${present > 1 ? 'live' : ''}`} />
        {/* Same reasoning as the squad room: alone isn't news, it's a
            reason to leave. This room is about one game, so the prompt
            asks about that rather than about nothing in particular. */}
        {present > 1 ? `${present} here` : "Say what you're seeing"}
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
              {m.body && <RichText text={m.body} className="gc-text" />}
              {m.pick && <ChatPick pick={m.pick} />}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {viewerId ? (
        <form onSubmit={send} className="gc-form">
          <MentionInput rows={2} maxLength={MAX} value={body} onChange={setBody}
            placeholder="Say something… $ for a team, @ for a person" />
          <div className="comment-form-foot">
            {/* One tap for the things people actually send in a game thread. */}
            <div className="gc-quick">
              {REACTION_EMOJI.slice(0, 4).map(e => (
                <button key={e} type="button" className="gc-quick-btn"
                  aria-label={`Add ${e}`}
                  onClick={() => setBody(b => (b + e).slice(0, MAX))}>{e}</button>
              ))}
              {/* Wider than the emoji, and labelled, because this is the
                  one button in the row that puts your own record in front
                  of the room — it shouldn't read as another sticker. */}
              <button type="button" className="gc-quick-btn gc-share-pick"
                title="Share one of your picks"
                onClick={() => setShowPicks(v => !v)}>
                + Pick
              </button>
            </div>
            <span className="comment-count-left">
              {MAX - body.length < 100 ? `${MAX - body.length} left` : ''}
            </span>
            <button className="btn" type="submit" disabled={sending || !body.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
          {showPicks && (
            <SharePickSheet
              viewerId={viewerId}
              onClose={() => setShowPicks(false)}
              onPick={(pick) => { setShowPicks(false); void post(body, pick.id) }}
            />
          )}
        </form>
      ) : (
        <p className="comment-signin">
          <Link href="/login" className="comment-signin-link">Log in</Link> to join the chat.
        </p>
      )}
    </div>
  )
}
