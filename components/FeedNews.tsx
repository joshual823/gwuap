import { timeAgo } from '@/lib/time'
import type { NewsItem } from '@/lib/news'

/**
 * A headline sitting in the timeline between picks.
 *
 * Deliberately not shaped like a PostCard. It carries no avatar, no
 * cashtag and no sentiment, and it says the outlet's name where an
 * author would go — because a headline is not something somebody here
 * posted, and a feed that blurs the two is the beginning of passing
 * other people's work off as your users'.
 */
export default function FeedNews({ item }: { item: NewsItem }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="feed-news">
      {item.image && <img src={item.image} alt="" className="feed-news-img" loading="lazy" />}
      <div className="feed-news-body">
        <span className="feed-news-kind">News</span>
        <span className="feed-news-title">{item.title}</span>
        <span className="feed-news-meta">
          {item.source}{item.published && ` · ${timeAgo(item.published)}`}
        </span>
      </div>
    </a>
  )
}
