import Link from 'next/link'
import FeedTabs from '@/components/FeedTabs'
import GameChat from '@/components/GameChat'
import { createClient } from '@/lib/supabaseServer'
import LivePicker from '@/components/LivePicker'
import { notFound } from 'next/navigation'
import { WATCH_FEEDS, feedsBySport, feedFor, roomKeyFor, embedSrcFor,
         fetchLive, embedSrcForVideo, LIVE_ROOM_PUBLIC } from '@/lib/watch'

export const metadata = {
  title: 'Free live sport',
  description:
    'Watch live tennis and table tennis free, and talk about the match while it happens.',
  // Nothing unlaunched should be sitting in search results, where it
  // would outlive the decision to hide it.
  ...(LIVE_ROOM_PUBLIC ? {} : { robots: { index: false, follow: false } }),
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
  searchParams: Promise<{ feed?: string; v?: string }>
}) {
  const search = await props.searchParams
  const feed = feedFor(search.feed)

  // Named broadcasts when there's an API key to ask with, an empty list
  // otherwise — in which case the channel embed below does what it
  // always did.
  const live = await fetchLive(feed)

  // The requested video is only honoured if it's one this feed is
  // actually streaming. Embedding whatever id arrives in the URL would
  // let anyone put any video on the page and pass it off as ours.
  const selected = live.find(v => v.id === search.v) ?? live[0] ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Hidden, but reachable by whoever has to decide whether it's ready.
  // A flag that can only be tested by launching isn't much of a flag.
  let canPreview = LIVE_ROOM_PUBLIC
  if (!canPreview && user) {
    const { data: me } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    canPreview = !!me?.is_admin
  }
  if (!canPreview) notFound()

  return (
    <div>
      <FeedTabs active="live" />

      <h1 className="page-title">Live</h1>

      {!LIVE_ROOM_PUBLIC && (
        <p className="form-warn">
          <strong>Not launched.</strong> Only admins can reach this page, and
          the tab is hidden. Add <code>YOUTUBE_API_KEY</code> in Vercel, then
          set <code>LIVE_ROOM_PUBLIC</code> to true in <code>lib/watch.ts</code>.
        </p>
      )}
      <p className="wr-sub">
        Free, official, and running most days. No account needed to watch.
      </p>

      {/* Grouped by sport rather than one long row, because the row is
          what stops scaling the moment there's a third sport in it. */}
      {feedsBySport().map(group => (
        <div key={group.sport} className="wr-group">
          <span className="wr-group-label">{group.sport}</span>
          <div className="wr-feeds">
            {group.feeds.map(f => (
              <Link
                key={f.key}
                href={f.key === WATCH_FEEDS[0].key ? '/live' : `/live?feed=${f.key}`}
                className={`league-chip-nav ${f.key === feed.key ? 'active' : ''}`}
              >
                {f.name}
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="wr-stage">
        <iframe
          className="wr-frame"
          src={selected ? embedSrcForVideo(selected.id) : embedSrcFor(feed)}
          title={selected ? selected.title : `${feed.name} live stream`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {selected && <p className="wr-now">{selected.title}</p>}

      {live.length > 1 && (
        <LivePicker videos={live} feedKey={feed.key} selectedId={selected?.id ?? ''} />
      )}

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
