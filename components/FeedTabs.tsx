import Link from 'next/link'
import { LIVE_ROOM_PUBLIC } from '@/lib/watch'

/** Home, Sports and — once it's launched — Live. */
export default function FeedTabs({ active }: { active: 'home' | 'scores' | 'live' }) {
  return (
    <div className="feed-tabs">
      <Link href="/feed" className={`feed-tab ${active === 'home' ? 'active' : ''}`}>Home</Link>
      <Link href="/scores" className={`feed-tab ${active === 'scores' ? 'active' : ''}`}>Sports</Link>
      {LIVE_ROOM_PUBLIC && (
        <Link href="/live" className={`feed-tab ${active === 'live' ? 'active' : ''}`}>Live</Link>
      )}
    </div>
  )
}
