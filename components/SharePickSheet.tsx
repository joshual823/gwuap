'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { timeAgo } from '@/lib/time'
import { BET_TYPES, labelFor } from '@/lib/odds'
import { CHAT_PICK_COLUMNS, type ChatPick } from '@/lib/chatPick'

type Row = ChatPick & { created_at: string }

/**
 * Choose one of your own posts to drop into a room.
 *
 * Your own, and only your own. "Share a pick" in a group chat means the
 * one you made — passing along somebody else's is what the repost button
 * on the feed is for, and a picker that offered the whole site would be
 * a search box, not a share button.
 */
export default function SharePickSheet({ viewerId, onPick, onClose }: {
  viewerId: string
  onPick: (pick: ChatPick) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from('posts')
      .select(`${CHAT_PICK_COLUMNS}, created_at`)
      .eq('author_id', viewerId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (active) setRows((data ?? []) as unknown as Row[]) })
    return () => { active = false }
  }, [viewerId])

  return (
    <div className="share-pick">
      <div className="share-pick-head">
        <strong>Share a pick</strong>
        <button type="button" className="share-pick-x" onClick={onClose} aria-label="Close">×</button>
      </div>

      {rows === null && <p className="share-pick-note">Loading…</p>}

      {rows?.length === 0 && (
        <p className="share-pick-note">
          You haven’t posted one yet.{' '}
          <Link href="/post/new" className="help-link">Post a pick</Link> and it’ll show up here.
        </p>
      )}

      <ul className="share-pick-list">
        {(rows ?? []).map(r => {
          const betEntry = BET_TYPES.find(b => b.value === r.bet_type)
          return (
            <li key={r.id}>
              <button type="button" className="share-pick-row" onClick={() => onPick(r)}>
                <span className="share-pick-tag">{r.tag ?? '—'}</span>
                <span className="share-pick-what">
                  {labelFor(r.sentiment, r.bet_type)}
                  {r.line != null && ` ${r.line}`}
                  {betEntry && ` · ${betEntry.short ?? betEntry.label}`}
                  {r.odds && ` · ${r.odds}`}
                </span>
                {r.post_kind === 'pick' && r.status !== 'pending'
                  ? <span className={`stamp ${r.status}`}>{r.status}</span>
                  : <span className="time">{timeAgo(r.created_at)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
