// Sports headlines from ESPN's public RSS feeds.
//
// Free, no API key, no account. Next caches each fetch for 15 minutes,
// so a feed is pulled at most four times an hour no matter how many
// people are looking at it — no database table, no cron job.
//
// We show headline, source, time, and a link out. We do NOT copy article
// text; that's the line between an aggregator and a scraper.
//
// Structured sports data (live scores, odds, injuries, player props) is a
// different product with real pricing. This is headlines only, on purpose.

import { SITE_NAME, SITE_URL } from './brand'

export type NewsItem = {
  title: string
  link: string
  published: string | null
  summary: string | null
  image: string | null
  source: string
}

// CBS is the primary source because its items carry an <enclosure>
// image and ESPN's don't. ESPN stays as a fallback for when a CBS feed
// errors or comes back empty. Both cover all twelve categories.
const CBS: Record<string, string> = {
  'NBA': 'nba',
  'NFL': 'nfl',
  'MLB': 'mlb',
  'NHL': 'nhl',
  'Soccer': 'soccer',
  'UFC': 'mma',
  'Boxing': 'boxing',
  'Tennis': 'tennis',
  'Golf': 'golf',
  'College Football': 'college-football',
  'College Basketball': 'college-basketball',
}

const ESPN: Record<string, string> = {
  'NBA': 'nba',
  'NFL': 'nfl',
  'MLB': 'mlb',
  'NHL': 'nhl',
  'Soccer': 'soccer',
  'UFC': 'mma',
  'Boxing': 'boxing',
  'Tennis': 'tennis',
  'Golf': 'golf',
  'College Football': 'ncf',
  'College Basketball': 'ncb',
}

/** The league chips shown on the News tab, in order. "Top" is all sports. */
export const NEWS_LEAGUES = ['Top', ...Object.keys(CBS)]

type Source = { name: string; url: string }

/** Yahoo redirects /rss.xml to its real path; fetch follows that. */
const YAHOO: Record<string, string> = {
  'NBA': 'nba', 'NFL': 'nfl', 'MLB': 'mlb', 'NHL': 'nhl',
  'Soccer': 'soccer', 'Tennis': 'tennis', 'Golf': 'golf',
  'College Football': 'college-football', 'College Basketball': 'college-basketball',
}

/** Strong on football and tennis, and every item carries an image. */
const GUARDIAN: Record<string, string> = {
  'Soccer': 'football', 'Tennis': 'sport/tennis', 'Boxing': 'sport/boxing',
  'NFL': 'sport/nfl', 'NBA': 'sport/nba', 'MLB': 'sport/mlb', 'Golf': 'sport/golf',
}

function sourcesFor(league: string): Source[] {
  const cbs = CBS[league]
  const espn = ESPN[league]
  const yahoo = YAHOO[league]
  const guardian = GUARDIAN[league]
  const out: Source[] = [
    { name: 'CBS Sports', url: cbs
        ? `https://www.cbssports.com/rss/headlines/${cbs}/`
        : 'https://www.cbssports.com/rss/headlines/' },
    { name: 'ESPN', url: espn
        ? `https://www.espn.com/espn/rss/${espn}/news`
        : 'https://www.espn.com/espn/rss/news' },
    { name: 'Yahoo Sports', url: yahoo
        ? `https://sports.yahoo.com/${yahoo}/rss.xml`
        : 'https://sports.yahoo.com/rss/' },
    { name: 'Sporting News', url: 'https://www.sportingnews.com/us/rss' },
  ]
  if (guardian) out.push({ name: 'The Guardian', url: `https://www.theguardian.com/${guardian}/rss` })
  return out
}

/** Same story from two outlets, told twice. Compared loosely on purpose. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60)
}

/**
 * The picture, however this particular feed chose to attach one.
 *
 * CBS uses <enclosure>. Sporting News and the Guardian use media:content
 * and media:thumbnail, which the enclosure-only reader ignored — so two
 * sources that ship an image with every story were contributing none.
 */
function itemImage(block: string): string | null {
  const patterns = [
    /<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i,
    /<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/i,
    /<media:thumbnail\b[^>]*\burl=["']([^"']+)["'][^>]*>/i,
  ]
  for (const re of patterns) {
    const m = re.exec(block)
    if (!m) continue
    const url = decodeEntities(m[1])
    if (/^https:\/\//.test(url)) return url
  }
  return null
}

function stripCdata(raw: string): string {
  return raw.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')   // last, so "&amp;lt;" doesn't double-decode
}

function tagContent(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(block)
  if (!m) return null
  const text = decodeEntities(stripCdata(m[1]))
    .replace(/<[^>]+>/g, '')   // drop any markup inside descriptions
    .trim()
  return text || null
}

/**
 * Headlines for a league. Returns [] rather than throwing — a news feed
 * being down should never take the page with it.
 */
export async function fetchNews(league: string, limit = 15): Promise<NewsItem[]> {
  // Every source, merged — not the first one that answers. CBS was
  // effectively the only source anyone ever saw, because it rarely
  // fails, so ESPN was a fallback that never ran.
  const batches = await Promise.all(
    sourcesFor(league).map(source => fetchFrom(source, limit)),
  )

  // Round-robin, not sorted by date. Yahoo publishes fifty items an hour
  // and sorting purely by time handed it the entire feed — the sources
  // that ship images were all newer-than-nothing and got sliced off the
  // end. Taking one from each in turn keeps every outlet represented and
  // still runs newest-first inside each of them.
  const seenLink = new Set<string>()
  const seenTitle = new Set<string>()
  const merged: NewsItem[] = []
  for (let round = 0; merged.length < limit; round++) {
    let added = false
    for (const batch of batches) {
      const item = batch[round]
      if (!item) continue
      added = true
      const key = titleKey(item.title)
      if (seenLink.has(item.link) || (key && seenTitle.has(key))) continue
      seenLink.add(item.link)
      if (key) seenTitle.add(key)
      merged.push(item)
      if (merged.length >= limit) break
    }
    if (!added) break
  }
  return merged
}

/**
 * Headlines across several leagues, interleaved rather than concatenated.
 *
 * Straight concatenation would give three NFL stories then three NBA
 * ones, so the second and third choices never appear above the fold.
 * Round-robin means each chosen league is represented from the first row.
 *
 * Falls back to Top when nothing comes back — a quiet league in the
 * off-season shouldn't leave the carousel empty.
 */
export async function fetchNewsMixed(leagues: string[], limit = 15): Promise<NewsItem[]> {
  if (leagues.length === 0) return fetchNews('Top', limit)

  const batches = await Promise.all(leagues.map(l => fetchNews(l, limit)))
  const mixed: NewsItem[] = []
  const seen = new Set<string>()

  for (let round = 0; mixed.length < limit; round++) {
    let added = false
    for (const batch of batches) {
      const item = batch[round]
      if (!item || seen.has(item.link)) continue
      seen.add(item.link)
      mixed.push(item)
      added = true
      if (mixed.length >= limit) break
    }
    if (!added) break
  }

  return mixed.length > 0 ? mixed : fetchNews('Top', limit)
}

async function fetchFrom(source: Source, limit: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': `${SITE_NAME}/1.0 (+${SITE_URL})` },
    })
    if (!res.ok) return []
    const xml = await res.text()

    const items: NewsItem[] = []
    for (const raw of xml.split('<item>').slice(1)) {
      const block = raw.split('</item>')[0]
      const title = tagContent(block, 'title')
      const link = tagContent(block, 'link')
      if (!title || !link) continue
      const pub = tagContent(block, 'pubDate')
      const parsed = pub ? new Date(pub) : null
      items.push({
        title,
        link,
        published: parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null,
        summary: tagContent(block, 'description'),
        image: itemImage(block),
        source: source.name,
      })
      if (items.length >= limit) break
    }
    return items
  } catch {
    return []
  }
}
