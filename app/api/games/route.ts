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
  const league = new URL(request.url).searchParams.get('league')
  if (!league || !LEAGUES_WITH_SCORES.includes(league)) {
    return Response.json({ games: [] })
  }

  const games = await fetchGamesWindow(league, 1, 10)

  // Finished games are no use here: you can't post a pick on a result.
  //
  // What's on now comes first. Sorted only by time, a live game sat
  // below every fixture for the next ten days and fell off the end of
  // the list — so the games someone is most likely to be posting about
  // were the ones they couldn't see. One sort here covers every league,
  // since every picker reads this endpoint.
  const rank: Record<string, number> = { in: 0, pre: 1 }
  const startOf = (g: { startsAt: string | null }) => {
    const t = g.startsAt ? Date.parse(g.startsAt) : NaN
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
  }
  const open = games
    .filter(g => g.state !== 'post')
    .sort((a, b) =>
      (rank[a.state] ?? 9) - (rank[b.state] ?? 9) || startOf(a) - startOf(b))
    .slice(0, 40)

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
