'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import MentionInput from '@/components/MentionInput'
import { REACTION_EMOJI } from '@/lib/reactions'
import RichText from '@/components/RichText'
import GifPicker from '@/components/GifPicker'
import ChatPick from '@/components/ChatPick'
import SharePickSheet from '@/components/SharePickSheet'
import { CHAT_PICK_COLUMNS, type ChatPick as Pick } from '@/lib/chatPick'
import { fitResize, MAX_SOURCE_BYTES } from '@/lib/image'

type Author = { id: string; username: string; avatar_url: string | null }

/** One speaker's line from the squad table, as the room needs it. */
export type ChatRecord = {
  wins: number; losses: number
  winPct: number | null
  provisional: boolean
}

/**
 * How a record colours a name.
 *
 * Only a record that has cleared the provisional bar gets a colour. 1-0
 * is a real record and a terrible basis for calling somebody good, and a
 * green ring on it would say otherwise — the table already makes that
 * distinction and the room shouldn't contradict it.
 *
 * Everything else is deliberately quiet. The reference for this layout
 * paints a saturated ring on every avatar and two enormous buy buttons
 * under the thread, which reads as a trading floor. That's the read this
 * site spent 10 Sep removing from the front page; a squad room is the
 * last place to put it back.
 */
function tone(r: ChatRecord | undefined) {
  if (!r || r.provisional || r.winPct == null) return ''
  return r.winPct >= 0.5 ? ' up' : ' down'
}
type Msg = {
  id: string; body: string; created_at: string
  image_url: string | null
  author: Author | null
  /** A pick shared into the room, read live so the card settles when it does. */
  pick?: Pick | null
}

const MAX = 500

/**
 * A squad's room. Same shape as the game chat, with one difference that
 * matters: this room is members-only, enforced in RLS rather than here.
 * A non-member's select returns nothing and their insert is refused, so
 * the worst a broken UI can do is show an empty room — not leak one.
 */
export default function SquadChat({ squadId, viewerId, isMember, records = {} }: {
  squadId: string
  viewerId: string | null
  isMember: boolean
  /** userId -> their line on the squad table. Absent for a new member. */
  records?: Record<string, ChatRecord>
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [present, setPresent] = useState(1)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGifs, setShowGifs] = useState(false)
  const [showPicks, setShowPicks] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const authors = useRef(new Map<string, Author | null>())
  const fileInput = useRef<HTMLInputElement>(null)
  const picks = useRef(new Map<string, Pick | null>())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMember) return
    const supabase = createClient()
    let active = true

    supabase
      .from('squad_messages')
      .select(`id, body, created_at, image_url, author:profiles!squad_messages_author_id_fkey ( id, username, avatar_url ), pick:posts!squad_messages_post_id_fkey ( ${CHAT_PICK_COLUMNS} )`)
      .eq('squad_id', squadId)
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
      .channel(`squad:${squadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `squad_id=eq.${squadId}` },
        async payload => {
          const row = payload.new as {
            id: string; body: string; created_at: string; author_id: string
            image_url: string | null; post_id: string | null
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
            : [...cur, {
                id: row.id, body: row.body, created_at: row.created_at,
                image_url: row.image_url ?? null, author, pick,
              }])
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

  /** Text, a picture, a shared pick, or any mix — but never none of them. */
  async function post(text: string, imageUrl: string | null, postId: string | null = null) {
    if (!viewerId) return
    if (!text.trim() && !imageUrl && !postId) return
    setSending(true); setError(null)
    const supabase = createClient()
    const { error: sendError } = await supabase
      .from('squad_messages')
      .insert({
        squad_id: squadId, author_id: viewerId, body: text.trim(),
        image_url: imageUrl, post_id: postId,
      })
    setSending(false)
    if (sendError) { setError(sendError.message); return }
    setBody('')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    await post(body, null)
  }

  async function attach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !viewerId) return
    setAttaching(true); setError(null)
    try {
      if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.')
      if (file.size > MAX_SOURCE_BYTES) throw new Error('That image is enormous.')
      // Shrunk in the browser, which also re-encodes it — and that strips
      // the EXIF a phone photo carries, including where it was taken.
      const resized = await fitResize(file)
      const form = new FormData()
      form.append('file', new File([resized], 'image.jpg', { type: 'image/jpeg' }))
      form.append('squad', squadId)
      const res = await fetch('/api/squad-image', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed.')
      await post(body, json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that image.')
    } finally {
      setAttaching(false)
      if (fileInput.current) fileInput.current.value = ''
    }
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
        {/* When somebody else is here, say so — that's the thing worth
            knowing. When they're alone, don't report it. "You're first in
            here" is a fact about the room being empty, delivered at the
            exact moment we want them to type; it reads as "nothing is
            happening" and gives them a reason to leave. A prompt costs
            the same line and asks for the thing instead. */}
        {present > 1 ? `${present} here` : "Say what's on your mind"}
      </div>

      <div className="gc-stream">
        {messages.length === 0 && (
          <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
            Nothing said yet. Start it.
          </p>
        )}
        {messages.map(m => (
          <div className="gc-msg" key={m.id}>
            <Link href={`/profile/${m.author?.username}`}
              className={`gc-ava${tone(records[m.author?.id ?? ''])}`}>
              <Avatar url={m.author?.avatar_url} size={34} name={m.author?.username} />
            </Link>
            <div className="gc-body">
              <div className="gc-head">
                <Link href={`/profile/${m.author?.username}`} className="uname">@{m.author?.username}</Link>
                {/* Their record, from the same standings the table uses. */}
                {(() => {
                  const r = records[m.author?.id ?? '']
                  if (!r || r.wins + r.losses === 0) return null
                  return (
                    <span className={`gc-rec mono${tone(r)}`}
                      title={r.provisional ? 'Too few settled picks to mean much yet' : 'Record in this squad'}>
                      {r.wins}&#8211;{r.losses}{r.provisional && <span className="gc-thin">thin</span>}
                    </span>
                  )
                })()}
                <span className="time">{timeAgo(m.created_at)}</span>
                {/* Only your own line. Removing somebody else's is the
                    owner's call and RLS decides it, so a button here
                    would be offering something the database may refuse. */}
                {m.author?.id === viewerId && (
                  <button type="button" className="gc-del" onClick={() => remove(m.id)}>Delete</button>
                )}
              </div>
              {m.body && <RichText text={m.body} className="gc-text" />}
              {m.pick && <ChatPick pick={m.pick} />}
              {m.image_url && (
                /* Not next/image: these are a Tenor url or a Supabase
                   object, and a GIF put through the optimiser stops
                   moving. */
                <img src={m.image_url} alt="" className="gc-image" loading="lazy" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="gc-form">
        <MentionInput rows={2} maxLength={MAX} value={body} onChange={setBody}
          placeholder="Say something… $ for a team, @ for a person" />
        <div className="comment-form-foot">
          <div className="gc-quick">
            {REACTION_EMOJI.slice(0, 4).map(e => (
              <button key={e} type="button" className="gc-quick-btn"
                aria-label={`Add ${e}`}
                onClick={() => setBody(b => (b + e).slice(0, MAX))}>{e}</button>
            ))}
            <button type="button" className="gc-quick-btn" title="Add a picture"
              disabled={attaching} onClick={() => fileInput.current?.click()}>
              {attaching ? '…' : '🖼'}
            </button>
            <button type="button" className="gc-quick-btn" title="Add a GIF"
              onClick={() => setShowGifs(v => !v)}>GIF</button>
            {/* Wider than the emoji, and labelled, because this is the
                one button in the row that puts your own record in front
                of the room — it shouldn't read as another sticker. */}
            <button type="button" className="gc-quick-btn gc-share-pick"
              title="Share one of your picks"
              onClick={() => { setShowPicks(v => !v); setShowGifs(false) }}>
              + Pick
            </button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={attach} />
          <span className="comment-count-left">
            {MAX - body.length < 100 ? `${MAX - body.length} left` : ''}
          </span>
          <button className="btn" type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--bear)', fontSize: 13 }}>{error}</p>}
        {showPicks && viewerId && (
          <SharePickSheet
            viewerId={viewerId}
            onClose={() => setShowPicks(false)}
            onPick={(pick) => { setShowPicks(false); void post(body, null, pick.id) }}
          />
        )}
        {showGifs && (
          <GifPicker
            onClose={() => setShowGifs(false)}
            onPick={(url) => { setShowGifs(false); void post(body, url) }}
          />
        )}
      </form>
    </div>
  )
}
