// Today's games, from ESPN's public scoreboard endpoints.
//
// This is the thing that makes the feed alive when nobody has posted.
// Every other module — the ticker, trending, the timeline — needs users.
// A scoreboard doesn't: there are games on whether or not anyone shows up.
//
// Free, no key. Undocumented, though: it's what every hobby sports
// project uses and it's been stable for years, but it isn't a contract.
// Everything here fails to an empty list rather than an error.

export type GameSide = { code: string; name: string; score: string | null }

export type Game = {
  id: string
  league: string          // one of the app's category names
  home: GameSide
  away: GameSide
  status: string          // "1:00 PM EDT", "Q3 4:22", "Final"
  state: 'pre' | 'in' | 'post'
  startsAt: string | null
  spread: string | null   // "SEA -3.5"
  overUnder: number | null
}

/**
 * Category name -> ESPN paths. Soccer has no combined endpoint, so it
 * merges the leagues a US audience actually bets. Boxing has no
 * scoreboard on ESPN at all, so it's absent by design rather than broken.
 */
const SCOREBOARDS: Record<string, string[]> = {
  'NFL': ['football/nfl'],
  'NBA': ['basketball/nba'],
  'MLB': ['baseball/mlb'],
  'NHL': ['hockey/nhl'],
  'College Football': ['football/college-football'],
  'College Basketball': ['basketball/mens-college-basketball'],
  'UFC': ['mma/ufc'],
  'Tennis': ['tennis/atp', 'tennis/wta'],
  'Golf': ['golf/pga'],
  'Soccer': ['soccer/eng.1', 'soccer/usa.1', 'soccer/uefa.champions', 'soccer/esp.1'],
}

/** Leagues shown in the feed rail — kept small so it's a handful of cached fetches. */
export const RAIL_LEAGUES = ['NFL', 'College Football', 'MLB', 'NBA', 'NHL']

export const LEAGUES_WITH_SCORES = Object.keys(SCOREBOARDS)

function side(competitor: any): GameSide {
  const team = competitor?.team ?? {}
  return {
    code: team.abbreviation ?? team.shortDisplayName ?? '',
    name: team.displayName ?? team.name ?? '',
    score: competitor?.score ?? null,
  }
}

async function fetchPath(path: string, league: string): Promise<Game[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`,
      // No custom User-Agent: ESPN 403s "Gwuap/1.0 (+https://gwuap.co)"
      // while accepting the default, curl's, or a browser's. Took a
      // header-by-header comparison to find, because every failure here
      // is swallowed into an empty rail by design.
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    const data = await res.json()

    const games: Game[] = []
    for (const event of data?.events ?? []) {
      const competition = event?.competitions?.[0]
      if (!competition) continue
      const competitors = competition.competitors ?? []
      const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0]
      const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1]
      if (!home || !away) continue

      const stateRaw = event?.status?.type?.state
      const odds = competition.odds?.[0]

      games.push({
        id: String(event.id),
        league,
        home: side(home),
        away: side(away),
        status: event?.status?.type?.shortDetail ?? '',
        state: stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre',
        startsAt: event?.date ?? null,
        spread: odds?.details ?? null,
        overUnder: typeof odds?.overUnder === 'number' ? odds.overUnder : null,
      })
    }
    return games
  } catch {
    return []
  }
}

/** Games for one category. Empty list if the league has no scoreboard. */
export async function fetchGames(league: string): Promise<Game[]> {
  const paths = SCOREBOARDS[league]
  if (!paths) return []
  const batches = await Promise.all(paths.map(p => fetchPath(p, league)))
  return sortGames(batches.flat())
}

/** A merged rail across the leagues most likely to have something on. */
export async function fetchRailGames(limit = 12): Promise<Game[]> {
  const batches = await Promise.all(RAIL_LEAGUES.map(l => fetchGames(l)))
  return sortGames(batches.flat()).slice(0, limit)
}

/** Live first — that's what someone wants to see — then upcoming, then finished. */
function sortGames(games: Game[]): Game[] {
  const rank = { in: 0, pre: 1, post: 2 } as const
  return games.sort((a, b) => {
    if (rank[a.state] !== rank[b.state]) return rank[a.state] - rank[b.state]
    return (a.startsAt ?? '').localeCompare(b.startsAt ?? '')
  })
}

/**
 * Link to the post form with the matchup already filled in.
 *
 * ESPN puts different things in `odds.details` depending on the sport:
 * "SEA -3.5" is a point spread, "SD -166" is a moneyline. They're told
 * apart by magnitude — American odds are never under 100, and a spread
 * is essentially never over it. Getting this wrong would drop a
 * moneyline into the cashtag as if it were a line.
 */
export function postHrefForGame(game: Game): string {
  const params = new URLSearchParams({ league: game.league })

  const parts = game.spread?.trim().split(/\s+/) ?? []
  const favourite = parts[0]?.toUpperCase()
  const figure = parts.slice(1).join(' ')
  const magnitude = Math.abs(parseFloat(figure.replace(/[^0-9.\-]/g, '')))

  const awayIsFavourite = favourite && favourite === game.away.code.toUpperCase()
  let primary = `$${awayIsFavourite ? game.away.code : game.home.code}`
  const secondary = `$${awayIsFavourite ? game.home.code : game.away.code}`

  if (figure && Number.isFinite(magnitude)) {
    if (magnitude >= 100) {
      // Moneyline: the number is the price, so it belongs in the odds field.
      params.set('bet', 'moneyline')
      params.set('odds', figure.replace(/[^0-9+\-]/g, ''))
    } else {
      // Spread: the number is part of how the pick is written.
      params.set('bet', 'spread')
      primary = `${primary} ${figure}`
    }
  }

  params.set('tag', primary)
  params.set('tag2', secondary)
  return `/post/new?${params.toString()}`
}
