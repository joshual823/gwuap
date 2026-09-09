/**
 * Highlight clips, from the leagues' own YouTube channels.
 *
 * The footage belongs to the leagues. It is not hosted here and never
 * will be — a takedown against a site whose entire product is that it
 * doesn't lie to you would be a remarkable way to go. What's allowed is
 * the embed player, which is what it exists for: the league gets the
 * view and the ad money, we get the clip.
 *
 * Every channel below was checked the way `lib/watch.ts` says to check
 * one: the id resolves to the official channel, and a video from it
 * answers YouTube's oEmbed endpoint, which only responds for videos
 * their owner permits to be embedded.
 *
 * Note this is a different thing from the Live room's list. That file
 * says the NFL, NBA, MLB and NHL can't be added, and it's right — about
 * live streams, which they sell. Highlights they publish themselves,
 * free, on these channels.
 *
 * Read over RSS rather than the Data API. The feed needs no key and
 * costs no quota, so clips work whether or not YOUTUBE_API_KEY is set,
 * and they can't starve the Live room of its 10,000 units a day.
 */

export type ClipFeed = {
  league: string
  channel: string
  /** Titles must contain one of these to count as a highlight. */
  match: string[]
}

export const CLIP_FEEDS: ClipFeed[] = [
  { league: 'NFL', channel: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', match: ['highlight'] },
  { league: 'MLB', channel: 'UCoLrcjPV5PbUrUyXq5mjc_A', match: ['highlight'] },
  { league: 'NBA', channel: 'UCWJ2lWNubArHWmf3FIHbfcQ', match: ['highlight'] },
  { league: 'NHL', channel: 'UCqFMzb-4AUf6WAIbl132QKA', match: ['highlight'] },
]

export type Clip = {
  id: string
  title: string
  thumbnail: string | null
  publishedAt: string | null
  league: string
}

const feedUrl = (channel: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`

/**
 * Pull the videos out of a channel feed. Pure, so it's tested against a
 * real response rather than a guess at one.
 *
 * The title filter is a heuristic and worth naming as one: a league
 * channel posts shows, interviews and its own adverts alongside the
 * highlights, and "NFL+ - Bed" is a real title from the real feed. There
 * is no field in the feed that says what kind of video this is, so the
 * only signal available is what the league chose to call it.
 */
export function parseClipFeed(xml: string, feed: ClipFeed): Clip[] {
  const entries = xml.split('<entry>').slice(1)
  const out: Clip[] = []

  for (const entry of entries) {
    const pick = (tag: string) => {
      const m = entry.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
      return m ? decode(m[1]) : null
    }
    const id = pick('yt:videoId')
    const title = pick('media:title') ?? pick('title')
    if (!id || !title) continue

    const haystack = title.toLowerCase()
    if (!feed.match.some(word => haystack.includes(word))) continue

    const thumb = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)
    out.push({
      id,
      title,
      thumbnail: thumb ? decode(thumb[1]) : null,
      publishedAt: pick('published'),
      league: feed.league,
    })
  }
  return out
}

/** The five entities an XML feed can carry. */
function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * The newest few from each league, rather than the newest overall.
 *
 * Pure recency doesn't work here: MLB plays every day and posts several
 * highlight reels a night, so in September it filled the rail on its own
 * and a visitor who follows the NFL saw nothing they'd asked for. Taking
 * a fixed number per league first and sorting afterwards means a league
 * in season can't crowd out one that isn't.
 */
export function capPerLeague(clips: Clip[], perLeague: number): Clip[] {
  const seen = new Map<string, number>()
  const kept: Clip[] = []
  // Input is already newest-first per feed, so "the first n" is "the
  // newest n" without sorting twice.
  for (const c of clips) {
    const used = seen.get(c.league) ?? 0
    if (used >= perLeague) continue
    seen.set(c.league, used + 1)
    kept.push(c)
  }
  const at = (c: Clip) => (c.publishedAt ? Date.parse(c.publishedAt) : 0)
  return kept.sort((a, b) => at(b) - at(a))
}

/**
 * The same videos from the Data API, which returns a deeper window.
 *
 * RSS gives the latest 15 uploads and nothing more. That's plenty for a
 * channel that posts a few times a week and useless for the NFL's, which
 * posts shows, interviews and its own adverts all day — on 9 Sep, two
 * days after Week 1, not one of its latest 15 was a highlight reel. The
 * playlist endpoint takes maxResults=50 for the same single quota unit,
 * which reaches past the noise.
 *
 * Used only when YOUTUBE_API_KEY is set. Four channels every ten minutes
 * is about 600 units a day against an allowance of 10,000, so this can
 * run alongside the Live room without crowding it.
 */
export function parseClipPlaylist(json: any, feed: ClipFeed): Clip[] {
  const items = Array.isArray(json?.items) ? json.items : []
  const out: Clip[] = []
  for (const item of items) {
    const snip = item?.snippet
    const id = snip?.resourceId?.videoId
    const title = snip?.title
    if (typeof id !== 'string' || !id || typeof title !== 'string' || !title) continue
    if (!feed.match.some(word => title.toLowerCase().includes(word))) continue
    out.push({
      id,
      title,
      thumbnail: snip?.thumbnails?.medium?.url ?? snip?.thumbnails?.default?.url ?? null,
      publishedAt: typeof snip?.publishedAt === 'string' ? snip.publishedAt : null,
      league: feed.league,
    })
  }
  return out
}

async function readOneFeed(feed: ClipFeed): Promise<Clip[]> {
  const key = process.env.YOUTUBE_API_KEY
  if (key) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/playlistItems' +
        `?part=snippet&maxResults=50&playlistId=UU${feed.channel.slice(2)}&key=${key}`,
        { next: { revalidate: 600 } },
      )
      if (res.ok) {
        const clips = parseClipPlaylist(await res.json(), feed)
        if (clips.length > 0) return clips
      }
      // A dead key, a quota wall or simply nothing matching: fall through
      // to RSS rather than showing an empty rail.
    } catch { /* same */ }
  }

  try {
    const res = await fetch(feedUrl(feed.channel), {
      // Highlights land within minutes of a game finishing, and a
      // channel feed is 24KB. Ten minutes is often enough to feel live
      // and rare enough to be free.
      next: { revalidate: 600 },
      headers: { Accept: 'application/atom+xml' },
    })
    if (!res.ok) return []
    return parseClipFeed(await res.text(), feed)
  } catch {
    return []
  }
}

async function readFeeds(feeds: ClipFeed[]): Promise<Clip[]> {
  return (await Promise.all(feeds.map(readOneFeed))).flat()
}

/**
 * Clips for one person, in the leagues they said they follow.
 *
 * Falling back to everything when their own leagues are quiet is
 * deliberate. Somebody who chose the NFL in February hasn't stopped
 * caring about the NFL — there's just nothing on — and an empty rail
 * teaches them the feature is broken. The same rule the scores rail
 * follows: preferences lead, the default mix always backfills.
 *
 * One feed failing is one league missing, never a page that doesn't
 * render.
 */
export async function fetchClips(
  leagues: string[],
  { limit = 12, perLeague = 2 }: { limit?: number; perLeague?: number } = {},
): Promise<Clip[]> {
  const wanted = CLIP_FEEDS.filter(f => leagues.includes(f.league))

  if (wanted.length > 0) {
    const chosen = capPerLeague(await readFeeds(wanted), perLeague)
    if (chosen.length > 0) return chosen.slice(0, limit)
  }

  return capPerLeague(await readFeeds(CLIP_FEEDS), perLeague).slice(0, limit)
}

export const embedFor = (id: string) => `https://www.youtube.com/embed/${id}`
export const watchOn = (id: string) => `https://www.youtube.com/watch?v=${id}`
