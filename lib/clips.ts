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
 * Newest first, across the leagues asked for. One feed failing is one
 * league missing, never a page that doesn't render — the same rule the
 * scoreboard and the Live room follow.
 */
export async function fetchClips(leagues: string[], limit = 12): Promise<Clip[]> {
  const wanted = CLIP_FEEDS.filter(f => leagues.includes(f.league))
  const feeds = wanted.length > 0 ? wanted : CLIP_FEEDS

  const batches = await Promise.all(feeds.map(async feed => {
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
  }))

  const at = (c: Clip) => (c.publishedAt ? Date.parse(c.publishedAt) : 0)
  return batches.flat().sort((a, b) => at(b) - at(a)).slice(0, limit)
}

export const embedFor = (id: string) => `https://www.youtube.com/embed/${id}`
export const watchOn = (id: string) => `https://www.youtube.com/watch?v=${id}`
