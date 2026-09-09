import Link from 'next/link'
import type { Clip } from '@/lib/clips'

/**
 * Highlights, as a scroller.
 *
 * Same shape as the scoreboard and the news rail, on purpose — a third
 * kind of horizontal strip that behaved differently would be a third
 * thing to learn. Nothing plays here: a card is a link, and the video
 * loads on its own page. Autoplaying four embeds in a feed would cost a
 * phone its battery and its data allowance to show four thumbnails.
 */
export default function ClipRail({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) return null
  return (
    <div className="clip-block">
      <div className="board-head">
        <span className="board-title">Highlights</span>
        <Link href="/clips" className="board-more">All clips →</Link>
      </div>
      <div className="board-rail">
        <div className="board-track">
          {clips.map(c => (
            <Link key={c.id} href={`/clips/${c.id}`} className="clip-card">
              <span className="clip-thumb">
                {c.thumbnail
                  ? <img src={c.thumbnail} alt="" loading="lazy" />
                  : <span className="clip-thumb-blank" />}
                <span className="clip-play">▶</span>
              </span>
              <span className="clip-league">{c.league}</span>
              <span className="clip-title">{c.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
