'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LiveVideo } from '@/lib/watch'

/**
 * Which of a channel's concurrent broadcasts to watch.
 *
 * The filter is client-side on purpose: the list is at most a couple of
 * dozen titles that the server already fetched, so sending a keystroke
 * back to find "Court 3" in it would be slower and cost quota.
 */
export default function LivePicker({ videos, feedKey, selectedId }: {
  videos: LiveVideo[]
  feedKey: string
  selectedId: string
}) {
  const [query, setQuery] = useState('')
  const liveCount = videos.filter(v => v.state === 'live').length
  const soonCount = videos.length - liveCount

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter(v => v.title.toLowerCase().includes(q))
  }, [videos, query])

  return (
    <div className="wr-live">
      <div className="wr-live-head">
        {/* "N live now" was a lie the moment scheduled broadcasts joined
            the list. Count them separately and say both. */}
        <span className="wr-live-count">
          {liveCount > 0 && <span className="live-dot" />}
          {liveCount > 0 ? `${liveCount} live now` : 'Nothing live'}
          {soonCount > 0 && <span className="wr-live-soon">· {soonCount} scheduled</span>}
        </span>
        {videos.length > 3 && (
          <input
            className="field wr-live-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a match…"
            aria-label="Search live matches"
          />
        )}
      </div>

      {shown.length === 0 && (
        <p className="wr-note">Nothing matches “{query.trim()}”.</p>
      )}

      <div className="wr-live-list">
        {shown.map(v => (
          <Link
            key={v.id}
            href={`/live?feed=${feedKey}&v=${v.id}`}
            className={`wr-live-item ${v.id === selectedId ? 'active' : ''}`}
          >
            {v.thumbnail
              ? <img src={v.thumbnail} alt="" className="wr-live-thumb" loading="lazy" />
              : <span className="wr-live-thumb wr-live-thumb-blank" />}
            <span className="wr-live-title">
              {v.title}
              {v.state === 'upcoming' && (
                <span className="wr-live-when">
                  {v.startsAt
                    ? new Date(v.startsAt).toLocaleString(undefined,
                        { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                    : 'Scheduled'}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
