'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import MentionInput from '@/components/MentionInput'
import { REACTION_EMOJI } from '@/lib/reactions'
import RichText from '@/components/RichText'

type Author = { id: string; username: string; avatar_url: string | null }
type Msg = { id: string; body: string; created_at: string; author: Author | null }

const MAX = 500

/**
 * A squad's room. Same shape as the game chat, with one difference that
 * matters: this room is members-only, enforced in RLS rather than here.
 * A non-member's select returns nothing and their insert is refused, so
 * the worst a broken UI can do is show an empty room — not leak one.
 */
export default function SquadChat({ squadId, viewerId, isMember }: {
  squadId: string
  viewerId: string | null
  isMember: boolean
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [present, setPresent] = useState(1)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authors = useRef(new Map<string, Author | null>())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMember) return
    const supabase = createClient()
    let active = true

    supabase
      .from('squad_messages')
      .select('id, body, created_at, author:profiles!squad_messages_author_id_fkey ( id, username, avatar_url )')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!active) return
        const rows = (data ?? []) as unknown as Msg[]
        rows.forEach(m => m.author && authors.current.set(m.author.id, m.author))
        setMessages(rows)
      })

    const channel = supabase
      .channel(`squad:${squadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `squad_id=eq.${squadId}` },
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
        { event: 'DELETE', schema: 'public', table: 'squad_messages' },
        payload => setMessages(cur => cur.filter(m => m.id !== (payload.old as any).id)))
      .on('presence', { event: 'sync' }, () => {
        setPresent(Object.keys(channel.presenceState()).length || 1)
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') channel.track({ at: squadId }) })

    return () => { active = false; supabase.removeChannel(channel) }
  }, [squadId, isMember])

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || !viewerId) return
    setSending(true); setError(null)
    const supabase = createClient()
    const { error: sendError } = await supabase
      .from('squad_messages').insert({ squad_id: squadId, author_id: viewerId, body: text })
    setSending(false)
    if (sendError) { setError(sendError.message); return }
    setBody('')
  }

  async function remove(id: string) {
    if (!confirm('Delete this message?')) return
    const supabase = createClient()
    await supabase.from('squad_messages').delete().eq('id', id)
    setMessages(cur => cur.filter(m => m.id !== id))
  }

  if (!isMember) {
    return (
      <p className="squad-locked">
        Join the squad to read the room. Nothing said in here is visible from
        outside it.
      </p>
    )
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
                {/* Only your own line. Removing somebody else's is the
                    owner's call and RLS decides it, so a button here
                    would be offering something the database may refuse. */}
                {m.author?.id === viewerId && (
                  <button type="button" className="gc-del" onClick={() => remove(m.id)}>Delete</button>
                )}
              </div>
              <RichText text={m.body} className="gc-text" />
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="gc-form">
        <MentionInput rows={2} maxLength={MAX} value={body} onChange={setBody}
          placeholder="Say something…" />
        <div className="comment-form-foot">
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
    </div>
  )
}
