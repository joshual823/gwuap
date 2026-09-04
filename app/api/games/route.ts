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
  const open = games.filter(g => g.state !== 'post').slice(0, 40)

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
