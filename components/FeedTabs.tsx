import Link from 'next/link'

/** Home and Scores. News moved to its own page, reachable from the carousel. */
export default function FeedTabs({ active }: { active: 'home' | 'scores' }) {
  return (
    <div className="feed-tabs">
      <Link href="/feed" className={`feed-tab ${active === 'home' ? 'active' : ''}`}>Home</Link>
      <Link href="/scores" className={`feed-tab ${active === 'scores' ? 'active' : ''}`}>Scores</Link>
    </div>
  )
}
