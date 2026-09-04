import { fetchGamesWindow, LEAGUES_WITH_SCORES } from '@/lib/scores'

export const dynamic = 'force-dynamic'

/**
 * Cashtags for whoever is actually playing.
 *
 * A hand-kept list can't cover tennis or MMA — the draw changes every
 * week and there are hundreds of names. But the scoreboard already
 * knows every competitor in every fixture, and the codes it produces are
 * the exact codes grading matches a pick against. So the suggestions
 * come from the fixtures rather than from a list somebody has to
 * remember to update.
 *
 * Public and read-only: the same names already on the scores pages.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const league = params.get('league')
  const q = (params.get('q') ?? '').replace(/^\$/, '').trim().toUpperCase()

  if (!league || !LEAGUES_WITH_SCORES.includes(league)) {
    return Response.json({ tickers: [] })
  }

  const games = await fetchGamesWindow(league, 3, 10)

  // One entry per competitor. A player appears in several fixtures, and
  // the code is stable within a fixture, so the first sighting wins.
  const seen = new Map<string, { code: string; name: string }>()
  for (const g of games) {
    for (const side of [g.away, g.home]) {
      if (!side.code || seen.has(side.code)) continue
      seen.set(side.code, { code: side.code, name: side.label ?? side.name ?? side.code })
    }
  }

  const all = [...seen.values()]
  const matches = q
    ? all.filter(t =>
        t.code.startsWith(q) ||
        t.name.toUpperCase().split(/[\s.]+/).some(word => word.startsWith(q)))
    : all

  return Response.json({ tickers: matches.slice(0, 8) })
}
