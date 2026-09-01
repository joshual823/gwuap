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

export type NewsItem = {
  title: string
  link: string
  published: string | null
  summary: string | null
}

/** Category name (as stored in the `categories` table) -> ESPN feed slug. */
const FEEDS: Record<string, string> = {
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
export const NEWS_LEAGUES = ['Top', ...Object.keys(FEEDS)]

function feedUrl(league: string): string {
  const slug = FEEDS[league]
  return slug
    ? `https://www.espn.com/espn/rss/${slug}/news`
    : 'https://www.espn.com/espn/rss/news'
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
  try {
    const res = await fetch(feedUrl(league), {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'Gwuap/1.0 (+https://gwuap.vercel.app)' },
    })
    if (!res.ok) return []
    const xml = await res.text()

    const items: NewsItem[] = []
    const blocks = xml.split('<item>').slice(1)
    for (const raw of blocks) {
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
      })
      if (items.length >= limit) break
    }
    return items
  } catch {
    return []
  }
}
