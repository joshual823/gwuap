import { createClient } from '@/lib/supabaseClient'
import { leagueForCode } from '@/lib/tickers'

/**
 * The leagues this person actually cares about, best guess first.
 *
 * There is no screen where somebody picks favourite leagues, and adding
 * one would be a settings page nobody fills in to solve a problem the
 * data already answers. What they follow is recoverable from what
 * they've done:
 *
 *   1. the league they last posted in — the strongest signal by far,
 *      because people post about one sport for a season at a time
 *   2. the leagues they post in generally, most frequent first
 *   3. the leagues of the cashtags on their watchlist
 *
 * Used to order suggestions, never to filter them. A wrong guess costs
 * somebody one extra scroll; filtering on a wrong guess would hide the
 * thing they came to post about, which is much worse than not guessing.
 */
export async function preferredLeagues(
  userId: string,
  categories: { id: number; name: string }[],
): Promise<string[]> {
  const nameOf = new Map(categories.map(c => [c.id, c.name]))
  const ranked: string[] = []
  const push = (name: string | null | undefined) => {
    if (name && !ranked.includes(name)) ranked.push(name)
  }

  try {
    const last = Number(localStorage.getItem('gwuap:lastLeague'))
    push(nameOf.get(last))
  } catch { /* private mode, or storage blocked */ }

  const supabase = createClient()

  const [{ data: mine }, { data: watched }] = await Promise.all([
    supabase.from('posts')
      .select('category_id')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase.from('watchlist').select('ticker').limit(40),
  ])

  // Most-posted first, so a season's worth of NFL outranks one stray NHL
  // take from March.
  const counts = new Map<string, number>()
  for (const row of (mine ?? []) as { category_id: number | null }[]) {
    const name = row.category_id === null ? null : nameOf.get(row.category_id)
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  for (const [name] of [...counts.entries()].sort((a, b) => b[1] - a[1])) push(name)

  for (const row of (watched ?? []) as { ticker: string | null }[]) {
    if (row.ticker) push(leagueForCode(row.ticker))
  }

  return ranked
}

/** Stable sort putting `preferred` leagues first, in their ranked order. */
export function byPreferredLeague<T extends { league: string }>(
  items: T[], preferred: string[],
): T[] {
  if (preferred.length === 0) return items
  const rank = new Map(preferred.map((name, i) => [name, i]))
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = rank.get(a.item.league) ?? Number.MAX_SAFE_INTEGER
      const rb = rank.get(b.item.league) ?? Number.MAX_SAFE_INTEGER
      return ra - rb || a.i - b.i
    })
    .map(x => x.item)
}
