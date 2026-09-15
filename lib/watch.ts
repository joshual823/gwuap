/**
 * Free live tennis.
 *
 * Both feeds here are the tour's own YouTube channels, embedded through
 * YouTube's player. That distinction is the whole reason this is allowed:
 * the matches are also free to watch on itftennis.com, but free to watch
 * is not free to rebroadcast, and iframing a federation's own player
 * would be the second thing. YouTube's embed is offered for this.
 *
 * The channel-level embed below resolves to whatever is live on that
 * channel right now, and shows YouTube's own offline card when nothing
 * is. That means no API key, no polling and nothing to schedule — which
 * matters, because the Data API's search quota would run dry and Hobby
 * only allows one cron a day.
 *
 * Deliberately not the matches on /scores. ESPN carries the main tour,
 * whose streaming rights are sold; what's free is the tier below it.
 */
/**
 * Whether the Live room is open to the public. Opened 15 Sep 2026.
 *
 * It waited on a YOUTUBE_API_KEY, and on the room being worth arriving
 * at. Both are settled: the key is in Vercel, and the page no longer
 * depends on something being live to be useful — every feed now names
 * where the tour streams it itself, which is the answer most of the
 * time. The ITF alone streams hundreds of matches a week and none of
 * them to YouTube.
 *
 * That is also what it is for. People ask "where can I watch this
 * match?" — on Polymarket, in group chats — and the honest answer for
 * the Challenger and ITF tiers is "free, here". Being the page that says
 * so is worth more traffic than a player that is dark half the day.
 */
export const LIVE_ROOM_PUBLIC = true

export type WatchFeed = {
  key: string
  /** Groups the picker. Not tied to the league list — what's free to
      watch and what has a scoreboard here are different sets. */
  sport: string
  name: string
  blurb: string
  /**
   * The tour's own YouTube channel, when it has one worth watching.
   *
   * Optional, because the honest answer for some tours is a link. The
   * ITF's channel has **two videos on it** — their streaming lives on
   * itftennis.com and nowhere else — so pointing a player at it showed
   * an empty stage and called it a feature.
   */
  channel?: string
  /**
   * Where the tour streams it themselves, which is the answer to the
   * question this page exists for. `account` is the thing worth warning
   * about up front: itftennis.com asks for nothing, the other two make
   * you sign up before you can watch a free match.
   */
  official: { label: string; href: string; account: boolean }
}

/**
 * Every feed here was checked the same way before it was added: the
 * channel resolved to an official one, and one of its videos came back
 * from YouTube's oEmbed endpoint, which only answers for videos their
 * owner allows to be embedded. Adding a channel without that check is
 * how you end up shipping a dead player, or someone else's rights.
 *
 * What can't be added, and won't be: the NFL, NBA, MLB, NHL and UFC.
 * They sell their streaming rights, so there is no free feed to embed.
 * That's a fact about the sport, not a gap in this list.
 */
export const WATCH_FEEDS: WatchFeed[] = [
  {
    key: 'itf',
    sport: 'Tennis',
    name: 'ITF World Tennis',
    blurb: 'The World Tennis Tour, where nearly every professional starts. Hundreds of matches a week, streamed free by the ITF with no account at all.',
    // No channel on purpose. @OfficialITFTennis has two videos.
    official: { label: 'itftennis.com', href: 'https://www.itftennis.com/en/live-stream/', account: false },
  },
  {
    key: 'challenger',
    sport: 'Tennis',
    name: 'ATP Challenger',
    blurb: 'One rung below the main tour. The ATP streams it free — some of it to YouTube, the rest on their own site.',
    channel: 'UCT12ocLoA-sqRfs12yQM2Bg',
    official: { label: 'atptour.com', href: 'https://www.atptour.com/en/atp-challenger-tour', account: true },
  },
  {
    key: 'wta',
    sport: 'Tennis',
    name: 'WTA',
    blurb: 'The main women\u2019s tour. Free to watch in a lot of the world once you have an account, though what you get depends on where you are \u2014 the rights are sold country by country.',
    official: { label: 'wtatennis.com', href: 'https://www.wtatennis.com/tv', account: true },
  },
  {
    key: 'wtt',
    sport: 'Table Tennis',
    name: 'World Table Tennis',
    blurb: 'WTT streams its Contender and Star Contender events free, table by table, and runs most weeks of the year.',
    channel: 'UC9ckyA_A3MfXUa0ttxMoIZw',
    official: { label: 'worldtabletennis.com', href: 'https://worldtabletennis.com/', account: true },
  },
]

/** The feeds grouped for the picker, in the order they're declared. */
export function feedsBySport(): { sport: string; feeds: WatchFeed[] }[] {
  const out: { sport: string; feeds: WatchFeed[] }[] = []
  for (const feed of WATCH_FEEDS) {
    const group = out.find(g => g.sport === feed.sport)
    if (group) group.feeds.push(feed)
    else out.push({ sport: feed.sport, feeds: [feed] })
  }
  return out
}

export function feedFor(key: string | undefined): WatchFeed {
  return WATCH_FEEDS.find(f => f.key === key) ?? WATCH_FEEDS[0]
}

/**
 * Chat room key. game_messages keys rooms by string and has no foreign
 * key to a game, so a watch room needs no schema change — only a prefix
 * that can't collide with the "LEAGUE:espn_id" the game pages use.
 */
export function roomKeyFor(feed: WatchFeed): string {
  return `watch:${feed.key}`
}

/*
 * `embed/live_stream?channel=…` used to live here and has been removed.
 * YouTube retired that form: it answers their own oEmbed endpoint with a
 * 404 and renders "Video player configuration error — Error 153" in the
 * player. It was the fallback for "no API key or nothing named", so the
 * room's default state was a broken player rather than the offline card
 * this file assumed. Only ever embed a specific video id.
 */

/**
 * Human label for a chat room key, for the moderation queue. Game rooms
 * key on "LEAGUE:espn_id", which means nothing to read; watch rooms key
 * on the feed.
 */
export function roomLabel(gameKey: string): string {
  if (!gameKey.startsWith('watch:')) {
    const [league, id] = gameKey.split(':')
    return id ? `${league} game #${id}` : gameKey
  }
  const feed = WATCH_FEEDS.find(f => roomKeyFor(f) === gameKey)
  return feed ? `Watch room · ${feed.name}` : 'Watch room'
}


// ---------------------------------------------------------------------
// What's live right now, by name.
//
// The channel embed above can only say "whatever is on this channel",
// which is fine until a federation runs four tables at once and you get
// an arbitrary one of them. Naming them needs the Data API.
//
// Deliberately not search.list, which is the obvious call and costs 100
// quota units against a 10,000/day allowance — about 33 polls a day
// across three feeds. A channel's uploads playlist holds its live
// broadcasts too, and reading it costs 1 unit, plus 1 more to ask which
// of those videos are actually live. Two units a poll leaves room to
// refresh every couple of minutes and never come close to the ceiling.
//
// Every failure here returns an empty list rather than throwing. No key,
// a quota wall, a bad response — all of them mean the same thing to the
// page, which is "fall back to the channel embed".
// ---------------------------------------------------------------------

export type LiveVideo = {
  id: string
  title: string
  thumbnail: string | null
  /** 'live' now, or scheduled and not started yet. */
  state: 'live' | 'upcoming'
  /** When an upcoming broadcast is due, ISO, if YouTube said. */
  startsAt: string | null
}

/**
 * A channel's uploads playlist has the same id with a different prefix.
 * Worth knowing, because looking it up properly is a whole extra call
 * for a string transformation.
 */
export function uploadsPlaylistFor(channelId: string): string {
  return `UU${channelId.slice(2)}`
}

/**
 * Pull the live and the scheduled ones out of a videos.list response.
 * Pure, so it's tested.
 *
 * Upcoming used to be filtered out. It is the more useful half for the
 * question this page answers — somebody asking where to watch a match
 * is usually asking before it starts, not during — so both come back,
 * live first, and the page says which is which.
 */
export function parseLiveVideos(videosJson: any): LiveVideo[] {
  const items = Array.isArray(videosJson?.items) ? videosJson.items : []
  const out: LiveVideo[] = items
    .filter((v: any) => {
      const s = v?.snippet?.liveBroadcastContent
      return s === 'live' || s === 'upcoming'
    })
    .map((v: any) => ({
      id: String(v.id ?? ''),
      title: String(v.snippet?.title ?? 'Untitled'),
      thumbnail:
        v.snippet?.thumbnails?.medium?.url ??
        v.snippet?.thumbnails?.default?.url ??
        null,
      state: (v.snippet?.liveBroadcastContent === 'live' ? 'live' : 'upcoming') as 'live' | 'upcoming',
      startsAt: v.liveStreamingDetails?.scheduledStartTime ?? null,
    }))
    .filter((v: LiveVideo) => v.id !== '')
  // Live first; scheduled after it, earliest first.
  return out.sort((a, b) => {
    if (a.state !== b.state) return a.state === 'live' ? -1 : 1
    return (a.startsAt ?? '').localeCompare(b.startsAt ?? '')
  })
}

export async function fetchLive(feed: WatchFeed): Promise<LiveVideo[]> {
  const key = process.env.YOUTUBE_API_KEY
  // A feed that streams on its own site has nothing to ask YouTube about.
  if (!feed.channel || !key) return []

  const get = async (url: string) => {
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) return null
    return res.json()
  }

  try {
    const playlist = await get(
      'https://www.googleapis.com/youtube/v3/playlistItems' +
      `?part=contentDetails&maxResults=20&playlistId=${uploadsPlaylistFor(feed.channel)}&key=${key}`,
    )
    const ids: string[] = (playlist?.items ?? [])
      .map((i: any) => i?.contentDetails?.videoId)
      .filter((id: unknown): id is string => typeof id === 'string' && id !== '')
    if (ids.length === 0) return []

    const videos = await get(
      'https://www.googleapis.com/youtube/v3/videos' +
      // liveStreamingDetails is what carries the scheduled start. Still
      // one unit: quota is per call, not per part.
      `?part=snippet,liveStreamingDetails&id=${ids.join(',')}&key=${key}`,
    )
    return parseLiveVideos(videos)
  } catch {
    // The room still works without this. Never let it take the page down.
    return []
  }
}

/** Embed one specific broadcast rather than "whatever is on the channel". */
export function embedSrcForVideo(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
