import { fetchGamesWindow, LEAGUES_WITH_SCORES } from '@/lib/scores'

export const dynamic = 'force-dynamic'

/**
 * Games for one league, for the post form.
 *
 * The form is a client component and the scoreboard lives on the server,
 * so it needs somewhere to ask. Read-only and public — it returns what
 * the scores pages already show to anyone.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const league = params.get('league')

  /**
   * `scope=take` is the leagueless mode, for the take form.
   *
   * A take doesn't ask for a league, so there's nothing to scope the
   * fixture list to and it has to come from everywhere at once. It also
   * wants the games a league-scoped pick list deliberately throws away:
   * **a game that finished an hour ago is the single most likely thing
   * somebody has a take about**, and "you can't post a pick on a result"
   * is true of picks and only picks.
   *
   * Every league is one cached fetch (`revalidate: 60` inside
   * `lib/scores`), so this is a handful of cache reads rather than a
   * handful of round-trips to ESPN.
   */
  const takeScope = params.get('scope') === 'take'

  if (!takeScope && (!league || !LEAGUES_WITH_SCORES.includes(league))) {
    return Response.json({ games: [] })
  }

  const games = takeScope
    ? await takeScopeGames()
    : await fetchGamesWindow(league as string, 1, 10)

  // Finished games are no use here: you can't post a pick on a result.
  //
  // What's on now comes first. Sorted only by time, a live game sat
  // below every fixture for the next ten days and fell off the end of
  // the list — so the games someone is most likely to be posting about
  // were the ones they couldn't see. One sort here covers every league,
  // since every picker reads this endpoint.
  const rank: Record<string, number> = takeScope
    // Live first, then what just ended, then what's next. A take is
    // usually about something that already happened.
    ? { in: 0, post: 1, pre: 2 }
    : { in: 0, pre: 1 }
  const startOf = (g: { startsAt: string | null }) => {
    const t = g.startsAt ? Date.parse(g.startsAt) : NaN
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
  }

  const DAY = 24 * 60 * 60 * 1000
  const cutoff = Date.now() - DAY
  const keep = (g: { state: string; startsAt: string | null }) => {
    if (g.state !== 'post') return true
    // Finished games only for takes, and only the last 24 hours —
    // yesterday's result is a take, last week's is a history lesson.
    if (!takeScope) return false
    const t = g.startsAt ? Date.parse(g.startsAt) : NaN
    return Number.isFinite(t) && t >= cutoff
  }

  const sorted = games
    .filter(keep)
    .sort((a, b) => {
      const byRank = (rank[a.state] ?? 9) - (rank[b.state] ?? 9)
      if (byRank !== 0) return byRank
      // Within the finished group, most recent first.
      return a.state === 'post' ? startOf(b) - startOf(a) : startOf(a) - startOf(b)
    })

  /**
   * Across leagues, deal one at a time rather than in league order.
   *
   * Straight sorting put twenty-five finished tennis matches above every
   * other sport, because a tennis day has far more fixtures than an NFL
   * one — so the leagues most people post about fell off the bottom.
   * Round-robin keeps the ranking (live before finished before upcoming)
   * while making sure the top of the list has more than one sport in it.
   */
  const open = takeScope ? roundRobinByLeague(sorted).slice(0, 40) : sorted.slice(0, 40)

  return Response.json({
    games: open.map(g => ({
      id: g.id, league: g.league, state: g.state, status: g.status, startsAt: g.startsAt,
      away: { code: g.away.code, label: g.away.label ?? g.away.code, logo: g.away.logo },
      home: { code: g.home.code, label: g.home.label ?? g.home.code, logo: g.home.logo },
      markets: g.markets ?? [], book: g.book ?? null,
      // The form derives a first-five or first-half line from this.
      overUnder: g.overUnder ?? null,
    })),
  })
}

/** Deals from each league's queue in turn, preserving the order within each. */
function roundRobinByLeague<T extends { league: string }>(items: T[]): T[] {
  const queues = new Map<string, T[]>()
  for (const item of items) {
    const q = queues.get(item.league)
    if (q) q.push(item)
    else queues.set(item.league, [item])
  }
  const out: T[] = []
  let dealt = true
  while (dealt) {
    dealt = false
    for (const q of queues.values()) {
      const next = q.shift()
      if (next) { out.push(next); dealt = true }
    }
  }
  return out
}

/**
 * Every league's window, cached in the instance for a minute.
 *
 * `lib/scores` leans on Next's fetch cache, and **that cache silently
 * refuses anything over 2MB** — which the tennis and college-football
 * scoreboards both exceed. Those leagues therefore hit ESPN on every
 * call, and the take scope asks for all eleven at once, so opening the
 * post form meant a fan-out of uncached round-trips before the first
 * suggestion appeared.
 *
 * The payload is identical for everyone (the personal ordering happens
 * client-side), so one fetch can serve every visitor for a minute. Per
 * instance rather than shared, which is the cheap 90% of the fix.
 */
let takeCache: { at: number; games: Awaited<ReturnType<typeof fetchGamesWindow>> } | null = null
const TAKE_TTL_MS = 60_000

async function takeScopeGames() {
  if (takeCache && Date.now() - takeCache.at < TAKE_TTL_MS) return takeCache.games
  const games = (await Promise.all(
    LEAGUES_WITH_SCORES.map(l => fetchGamesWindow(l, 1, 3).catch(() => [])),
  )).flat()
  takeCache = { at: Date.now(), games }
  return games
}
