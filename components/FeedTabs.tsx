import Link from 'next/link'

/** Home and Sports. News moved to its own page, reachable from the carousel. */
export default function FeedTabs({ active }: { active: 'home' | 'scores' }) {
  return (
    <div className="feed-tabs">
      <Link href="/feed" className={`feed-tab ${active === 'home' ? 'active' : ''}`}>Home</Link>
      <Link href="/scores" className={`feed-tab ${active === 'scores' ? 'active' : ''}`}>Sports</Link>
    </div>
  )
}
