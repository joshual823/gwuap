import Link from 'next/link'
import { timeAgo } from '@/lib/time'
import type { NewsItem } from '@/lib/news'

/** Headlines as a swipeable row of image cards, rather than a list of links. */
export default function NewsRail({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="board">
      <div className="board-head">
        <span className="board-title">Today in sports</span>
        <Link href="/feed?tab=news" className="board-more">All headlines →</Link>
      </div>
      <div className="board-rail">
        <div className="board-track">
          {items.map(item => (
            <a href={item.link} target="_blank" rel="noopener noreferrer" key={item.link} className="news-card">
              {item.image
                ? <img src={item.image} alt="" className="news-card-img" loading="lazy" />
                : <div className="news-card-img placeholder" />}
              <div className="news-card-body">
                <span className="news-card-title">{item.title}</span>
                <span className="news-card-meta">
                  {item.source}{item.published && ` · ${timeAgo(item.published)}`}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
