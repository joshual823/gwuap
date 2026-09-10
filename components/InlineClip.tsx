'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Clip } from '@/lib/clips'

/**
 * A clip that plays where it sits.
 *
 * Not autoplay. Facebook and X autoplay their own MP4s — a few hundred
 * kilobytes they host themselves. These are YouTube iframes, and each is
 * a whole player: about a megabyte of JavaScript before a single frame.
 * Four of those starting on their own would cost a phone its battery and
 * its data to show four thumbnails, and on a metered connection that's
 * somebody else's money.
 *
 * So the player is built on the first tap and not before. Nothing but an
 * image loads until somebody asks for the video, and then it starts
 * immediately — with sound, because the tap is the permission browsers
 * otherwise make you earn by muting.
 *
 * The title stays a link to the clip's own page, which is where the
 * comments are.
 */
export default function InlineClip({ clip, className = '' }: {
  clip: Clip
  className?: string
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className={`clip-card ${className}`}>
      {playing ? (
        <span className="clip-thumb clip-thumb-live">
          <iframe
            // autoplay is honoured because a tap started it. enablejsapi
            // is deliberately absent: nothing here needs to talk to the
            // player, and it's another script for the page to load.
            src={`https://www.youtube.com/embed/${clip.id}?autoplay=1&rel=0&playsinline=1`}
            title={clip.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </span>
      ) : (
        <button type="button" className="clip-thumb clip-thumb-btn"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${clip.title}`}>
          {clip.thumbnail
            ? <img src={clip.thumbnail} alt="" loading="lazy" />
            : <span className="clip-thumb-blank" />}
          <span className="clip-play">▶</span>
        </button>
      )}
      <span className="clip-league">{clip.league}</span>
      <Link href={`/clips/${clip.id}`} className="clip-title">{clip.title}</Link>
    </div>
  )
}
