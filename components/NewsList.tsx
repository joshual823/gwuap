import Link from 'next/link'
import { timeAgo } from '@/lib/time'
import type { NewsItem } from '@/lib/news'

/**
 * Headlines with a way to act on them.
 *
 * The "Post a pick" button is the whole point: without it a news tab is
 * an exit ramp, and we'd be spending attention to send traffic to
 * someone else. With it, a headline becomes a prompt — which also
 * happens to solve the blank-post-form problem.
 *
 * Thumbnails are plain <img>, not next/image, on purpose: Vercel's image
 * optimization is metered and these are already-sized remote files.
 */
export default function NewsList({ items, league }: { items: NewsItem[]; league: string }) {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
        No headlines right now — the feed didn't answer. Try another league.
      </p>
    )
  }

  return (
    <div>
      {items.map(item => (
        <article className="news-item" key={item.link}>
          <div className="news-row">
            <div className="news-main">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-title">
                {item.title}
              </a>
              <div className="news-meta">
                <span>{item.source}</span>
                {item.published && <><span className="dot">·</span><span>{timeAgo(item.published)}</span></>}
              </div>
            </div>
            {item.image && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-thumb-link">
                <img src={item.image} alt="" className="news-thumb" loading="lazy" />
              </a>
            )}
          </div>
          {item.summary && <p className="news-summary">{item.summary}</p>}
          <Link
            href={`/post/new?league=${encodeURIComponent(league)}&headline=${encodeURIComponent(item.title)}`}
            className="news-cta"
          >
            Post a pick on this →
          </Link>
        </article>
      ))}
      <p className="news-footer">
        Headlines from CBS Sports and ESPN. Tap one to read it there.
      </p>
    </div>
  )
}
