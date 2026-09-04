import Link from 'next/link'
import FeedTabs from '@/components/FeedTabs'
import GameChat from '@/components/GameChat'
import { createClient } from '@/lib/supabaseServer'
import { WATCH_FEEDS, feedFor, roomKeyFor, embedSrcFor } from '@/lib/watch'

export const metadata = {
  title: 'Free live tennis',
  description:
    'Watch the ATP Challenger and ITF World Tennis Tours free, and talk about the match while it happens.',
}

export const dynamic = 'force-dynamic'

/**
 * A room built around a stream rather than a fixture.
 *
 * The obvious version of this — a player on each game page, next to the
 * score — can't be built. What's on /scores is the main tour, whose
 * streaming rights are sold, and what streams free is the tier below it,
 * which ESPN doesn't carry. The two sets don't intersect. On top of that
 * a Challenger feed covers a court for the whole day, not one match, so
 * there'd be nothing to attach it to even if the scores existed.
 *
 * So the room is the destination. No score panel: the stream carries its
 * own scoreboard, and a second one that didn't match it would be worse
 * than none.
 */
export default async function LivePage(props: {
  searchParams: Promise<{ feed?: string }>
}) {
  const search = await props.searchParams
  const feed = feedFor(search.feed)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <FeedTabs active="live" />

      <h1 className="page-title">Live Tennis</h1>
      <p className="wr-sub">
        Free, official, and running most days. No account needed to watch.
      </p>

      {WATCH_FEEDS.length > 1 && (
        <div className="wr-feeds">
          {WATCH_FEEDS.map(f => (
            <Link
              key={f.key}
              href={f.key === WATCH_FEEDS[0].key ? '/live' : `/live?feed=${f.key}`}
              className={`league-chip-nav ${f.key === feed.key ? 'active' : ''}`}
            >
              {f.name}
            </Link>
          ))}
        </div>
      )}

      <div className="wr-stage">
        <iframe
          className="wr-frame"
          src={embedSrcFor(feed)}
          title={`${feed.name} live stream`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <p className="wr-note">
        {feed.blurb}{' '}
        {/* The player says "offline" itself when nothing is live, and says
            so in the viewer's language. Repeating it here in our own words
            would only be wrong half the time. */}
        If the player is dark, nothing is on this feed right now.
      </p>

      <h2 className="wr-chat-head">Courtside</h2>
      <GameChat gameKey={roomKeyFor(feed)} viewerId={user?.id ?? null} />
    </div>
  )
}
