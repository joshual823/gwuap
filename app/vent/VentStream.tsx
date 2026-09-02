'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'
import VentActions from './VentActions'
import RichText from '@/components/RichText'

export type VentRow = {
  id: string
  body: string
  created_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
}

const QUIET_AFTER_MS = 2 * 60 * 60 * 1000

export default function VentStream({ initial, viewerId }: {
  initial: VentRow[]
  viewerId: string
}) {
  const [messages, setMessages] = useState<VentRow[]>(initial)
  const [present, setPresent] = useState(1)
  const authorCache = useRef(new Map<string, VentRow['author']>())

  // Server data wins on refresh — the composer refreshes after posting.
  useEffect(() => { setMessages(initial) }, [initial])

  useEffect(() => {
    const supabase = createClient()
    for (const m of initial) if (m.author) authorCache.current.set(m.author.id, m.author)

    const channel = supabase
      .channel('vent-room')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vent_messages' },
        async payload => {
          const row = payload.new as { id: string; body: string; created_at: string; author_id: string }
          let author = authorCache.current.get(row.author_id) ?? null
          if (!author) {
            const { data } = await supabase.from('profiles')
              .select('id, username, avatar_url').eq('id', row.author_id).maybeSingle()
            author = (data as VentRow['author']) ?? null
            if (author) authorCache.current.set(row.author_id, author)
          }
          setMessages(current =>
            current.some(m => m.id === row.id)
              ? current
              : [{ id: row.id, body: row.body, created_at: row.created_at, author }, ...current])
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'vent_messages' },
        payload => setMessages(c => c.filter(m => m.id !== (payload.old as any).id)))
      // Presence is what makes the room honest about whether anyone is here.
      .on('presence', { event: 'sync' }, () => {
        setPresent(Object.keys(channel.presenceState()).length || 1)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') channel.track({ at: Date.now() })
      })

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quiet = useMemo(() => {
    if (present > 1) return false
    const newest = messages[0]
    if (!newest) return true
    return Date.now() - new Date(newest.created_at).getTime() > QUIET_AFTER_MS
  }, [present, messages])

  return (
    <>
      <div className="vent-presence">
        <span className={`vent-dot ${present > 1 ? 'live' : ''}`} />
        {present > 1
          ? `${present} people here right now`
          : "You're the only one here right now"}
      </div>

      {quiet && (
        <p className="vent-quiet">
          It's quiet in here. Someone will see this, but it might not be tonight —
          if you need to talk to a person now, the helpline above answers 24/7 on{' '}
          <a href="tel:18005224700">1-800-522-4700</a>.
        </p>
      )}

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
              {m.author?.id && (
                <VentActions messageId={m.id} authorId={m.author.id} viewerId={viewerId} />
              )}
            </div>
            <RichText text={m.body} className="comment-text" />
          </div>
        </article>
      ))}
    </>
  )
}
