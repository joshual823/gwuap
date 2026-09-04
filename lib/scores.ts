// Today's games, from ESPN's public scoreboard endpoints.
//
// This is the thing that makes the feed alive when nobody has posted.
// Every other module — the ticker, trending, the timeline — needs users.
// A scoreboard doesn't: there are games on whether or not anyone shows up.
//
// Free, no key. Undocumented, though: it's what every hobby sports
// project uses and it's been stable for years, but it isn't a contract.
// Everything here fails to an empty list rather than an error.

export type GameSide = {
  code: string; name: string; score: string | null; logo: string | null
  byPeriod?: string[]        // tennis set scores; absent for team sports
  // What to print. Team sports show the abbreviation and don't set this.
  // Tennis codes are stripped of punctuation because they double as
  // watchlist tickers, which turns Auger-Aliassime into AUGERALIASSIME —
  // fine as a key, unreadable as a label.
  label?: string             // "F. Auger-Aliassime"
}

/**
 * One real, priced thing you can bet on this game.
 *
 * The point of carrying these is that a pick can then be a selection
 * rather than a typed claim: the price came from a book at a moment,
 * instead of from whatever the author felt like entering.
 */
export type Market = {
  kind: 'moneyline' | 'spread' | 'total'
  /** Which side of it. Team code for moneyline and spread. */
  side: 'home' | 'away' | 'over' | 'under'
  code: string | null     // team abbreviation, or null for a total
  line: number | null     // -1.5 on a spread, 8.5 on a total
  odds: string            // American, as written: "-159", "+131"
  label: string           // "PIT -1.5", "Over 8.5"
}

export type Game = {
  id: string
  league: string          // one of the app's category names
  /** Real priced markets, when the book has posted them. */
  markets?: Market[]
  book?: string           // who priced them, e.g. "DraftKings"
  // Tennis only. A match needs its draw and round to mean anything —
  // "Swiatek v Gauff" is a different event in the 2nd round than in a
  // final, and the men's and women's draws run in the same feed.
  draw?: string           // "Women's Singles"
  round?: string          // "2nd Round"
  court?: string          // "Court 5"
  note?: string           // "Fearnley bt Baena 7-6 (7-3) 6-3"
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
  // One endpoint only: the ATP scoreboard already carries the women's
  // and mixed groupings, so adding tennis/wta returns everything twice.
  'Tennis': ['tennis/atp', 'tennis/wta'],
  'Golf': ['golf/pga'],
  'Soccer': ['soccer/eng.1', 'soccer/usa.1', 'soccer/uefa.champions', 'soccer/esp.1'],
}

/** ESPN path for a league, used by the game-detail endpoint. */
export function espnPathFor(league: string): string | null {
  return SCOREBOARDS[league]?.[0] ?? null
}

export type GameDetail = {
  league: string
  id: string
  status: string
  state: 'pre' | 'in' | 'post'
  periods: string[]                 // column headings: 1 2 3 4, or innings
  sides: {
    code: string; name: string; score: string | null
    record: string | null; byPeriod: string[]; logo: string | null
    label?: string
  }[]
  odds: { label: string; value: string }[]
  summary: string | null            // tennis: ESPN's one-line match result
  lastPlay: string | null
  lastPlayKind: string | null
  venue: string | null
  broadcast: string | null
}

/** Leagues shown in the feed rail — kept small so it's a handful of cached fetches. */
export const RAIL_LEAGUES = ['NFL', 'College Football', 'MLB', 'NBA', 'NHL', 'Tennis']

export const LEAGUES_WITH_SCORES = Object.keys(SCOREBOARDS)

function side(competitor: any): GameSide {
  const team = competitor?.team ?? {}
  return {
    code: team.abbreviation ?? team.shortDisplayName ?? '',
    name: team.displayName ?? team.name ?? '',
    score: competitor?.score ?? null,
    logo: team.logo ?? null,
    // Innings for baseball, quarters for football. Carried because
    // several of the bets people actually make are about part of a game
    // rather than all of it, and this is the only place that says so.
    byPeriod: (competitor?.linescores ?? [])
      .map((l: any) => String(l?.value ?? l?.displayValue ?? ''))
      .filter((v: string) => v !== ''),
  }
}

/** Surname, uppercased — matches the ticker codes in lib/tickers.ts. */
function athleteCode(athlete: any): string {
  const last = athlete?.lastName || athlete?.displayName?.split(/\s+/).slice(-1)[0] || ''
  return String(last).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function firstNameOf(athlete: any): string {
  const first = athlete?.firstName || athlete?.displayName?.split(/\s+/)[0] || ''
  return String(first).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Two codes that can't be the same.
 *
 * Surnames collide — a Fernandez plays a Fernandez often enough in
 * tennis, and it isn't only ugly: a pick records the code it was made
 * on, and grading finds the side by matching that code, so two identical
 * codes make it undecidable which player was backed.
 *
 * Widen by one letter of the first name at a time until they differ, so
 * two Fernandezes become L and B, and two J. Smiths become JO and JA
 * rather than both landing on J. Genuinely identical names — same first,
 * same last — can't be told apart from a scoreboard at all, so they get
 * a number and stop being ambiguous even if they aren't informative.
 */
export function distinctCodes(a: any, b: any, codeA: string, codeB: string): [string, string] {
  if (codeA !== codeB) return [codeA, codeB]

  const firstA = firstNameOf(a)
  const firstB = firstNameOf(b)
  const longest = Math.max(firstA.length, firstB.length)

  for (let n = 1; n <= longest; n++) {
    const wideA = `${firstA.slice(0, n)}${codeA}`
    const wideB = `${firstB.slice(0, n)}${codeB}`
    if (wideA !== wideB) return [wideA, wideB]
  }

  return [`${codeA}1`, `${codeB}2`]
}

/**
 * Tennis doesn't look like team sport. The scoreboard returns one event
 * per tournament, with the whole draw nested under `groupings` — 239
 * matches for a Grand Slam, nearly all finished. Only matches that
 * haven't been played are worth showing.
 */
/**
 * Sports where the competitors are people rather than teams.
 *
 * Tennis and MMA are the same shape with one difference: a tournament
 * nests its matches under `groupings`, while a fight card lists them
 * straight on the event. Both give athletes with no `team`, which is why
 * the team parser produced nameless cards for UFC — it read one
 * competition per event and looked for an abbreviation that isn't there.
 */
function parseIndividual(data: any, league: string, full = false): Game[] {
  const games: Game[] = []
  for (const event of data?.events ?? []) {
    // A tournament groups its draw; a fight card doesn't group at all.
    const groups: any[] = (event?.groupings?.length ?? 0) > 0
      ? event.groupings
      : [{ grouping: null, competitions: event?.competitions ?? [] }]

    for (const grouping of groups) {
      // Doubles competitions carry no `athlete`, so they fall out at the
      // code check below rather than needing a filter here.
      const draw = grouping?.grouping?.displayName ?? undefined
      for (const competition of grouping?.competitions ?? []) {
        const state = competition?.status?.type?.state
        // The draw is mostly history, so finished matches stay out of the
        // cards — but the detail page still has to be able to find one.
        if (state === 'post' && !full) continue
        const competitors = competition?.competitors ?? []
        if (competitors.length !== 2) continue  // skip doubles and byes
        const [a, b] = competitors
        const rawCodeA = athleteCode(a?.athlete)
        const rawCodeB = athleteCode(b?.athlete)
        if (!rawCodeA || !rawCodeB) continue
        const [codeA, codeB] = distinctCodes(a?.athlete, b?.athlete, rawCodeA, rawCodeB)

        // ESPN carries set-by-set linescores for tennis. The running score
        // is sets won, which is what a tennis scoreboard actually shows.
        //
        // Tiebreaks follow the convention every scoreboard uses: only the
        // player who lost the set carries the breaker score, so 7-6 on a
        // 7-3 breaker reads "7" and "6 (3)". Printing it on both lines
        // would say the same thing twice and read as a 7-7 set.
        const rawA = a?.linescores ?? []
        const rawB = b?.linescores ?? []

        // A fight is decided, not scored. Expressing the result as 1-0
        // means a moneyline settles through exactly the same arithmetic
        // as every other sport, and a draw — nobody marked winner —
        // lands on 0-0, which grades as a push. No special case anywhere
        // downstream.
        const decided = state === 'post'
        const verdict = (c: any) => (decided ? (c?.winner === true ? '1' : '0') : null)
        const gamesIn = (l: any) => Number(l?.value ?? l?.displayValue ?? NaN)
        const setScores = (mine: any[], theirs: any[]) => mine.map((l: any, i: number) => {
          const games = String(l?.value ?? l?.displayValue ?? '')
          const lost = gamesIn(l) < gamesIn(theirs[i])
          return l?.tiebreak != null && lost ? `${games} (${l.tiebreak})` : games
        })
        const setsA = setScores(rawA, rawB)
        const setsB = setScores(rawB, rawA)
        const setsWon = (mine: any[], theirs: any[]) =>
          mine.reduce((n: number, l: any, i: number) =>
            n + (gamesIn(l) > gamesIn(theirs[i]) ? 1 : 0), 0)

        games.push({
          id: String(competition.id ?? `${event.id}-${codeA}-${codeB}`),
          league,
          // Tennis has no crests, but ESPN ships a country flag per
          // athlete, which is what every tennis scoreboard shows instead.
          away: {
            code: codeA, name: a?.athlete?.displayName ?? codeA,
            label: a?.athlete?.shortName ?? undefined,
            logo: a?.athlete?.flag?.href ?? null,
            score: rawA.length ? String(setsWon(rawA, rawB)) : verdict(a), byPeriod: setsA,
          },
          home: {
            code: codeB, name: b?.athlete?.displayName ?? codeB,
            label: b?.athlete?.shortName ?? undefined,
            logo: b?.athlete?.flag?.href ?? null,
            score: rawB.length ? String(setsWon(rawB, rawA)) : verdict(b), byPeriod: setsB,
          },
          draw,
          round: competition?.round?.displayName ?? undefined,
          court: competition?.venue?.court ?? undefined,
          note: (competition?.notes ?? []).find((n: any) => n?.text)?.text ?? undefined,
          status: competition?.status?.type?.shortDetail ?? event?.name ?? '',
          state: state === 'in' ? 'in' : state === 'post' ? 'post' : 'pre',
          startsAt: competition?.date ?? event?.date ?? null,
          spread: null,
          overUnder: null,
        })
      }
    }
  }
  // A Grand Slam draw is hundreds of unplayed matches stretching a
  // fortnight out. Only the next few are worth a card — but that's a
  // display rule, so it must not apply when a caller is looking a
  // specific match up by id.
  const seen = new Set<string>()
  const unique = games.filter(g => {
    const key = `${g.away.code}-${g.home.code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return full ? sortGames(unique) : sortGames(unique).slice(0, 8)
}

/**
 * The priced markets on a game, from the book ESPN carries.
 *
 * Only offered before kick-off: once a game starts ESPN drops the odds
 * block entirely, and a stale price shown as if it were live would be
 * worse than showing nothing.
 *
 * Anything missing is skipped rather than defaulted. A market with a
 * guessed price is exactly the thing this exists to prevent.
 */
function parseMarkets(odds: any, awayCode: string, homeCode: string): Market[] {
  if (!odds) return []
  const markets: Market[] = []

  const priceOf = (node: any): string | null => {
    const raw = node?.close?.odds ?? node?.current?.odds ?? node?.open?.odds
    if (raw == null) return null
    const text = String(raw).trim()
    if (!text) return null
    // American odds are written with a sign; ESPN sometimes omits the +.
    return /^[+-]/.test(text) ? text : `+${text}`
  }
  const lineOf = (node: any): number | null => {
    const raw = node?.close?.line ?? node?.current?.line ?? node?.open?.line
    if (raw == null) return null
    const n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  for (const [side, code] of [['away', awayCode], ['home', homeCode]] as const) {
    const ml = priceOf(odds?.moneyline?.[side])
    if (ml) {
      markets.push({ kind: 'moneyline', side, code, line: null, odds: ml, label: `${code} ${ml}` })
    }
    const sp = odds?.pointSpread?.[side]
    const spOdds = priceOf(sp)
    const spLine = lineOf(sp)
    if (spOdds && spLine !== null) {
      const written = spLine > 0 ? `+${spLine}` : String(spLine)
      markets.push({ kind: 'spread', side, code, line: spLine, odds: spOdds, label: `${code} ${written}` })
    }
  }

  for (const side of ['over', 'under'] as const) {
    const t = odds?.total?.[side]
    const tOdds = priceOf(t)
    const tLine = lineOf(t)
    if (tOdds && tLine !== null) {
      const word = side === 'over' ? 'Over' : 'Under'
      markets.push({ kind: 'total', side, code: null, line: tLine, odds: tOdds, label: `${word} ${tLine}` })
    }
  }

  return markets
}

async function fetchPath(
  path: string, league: string, dates?: string, full = false,
): Promise<Game[]> {
  try {
    const query = dates ? `?dates=${dates}` : ''
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard${query}`,
      // No custom User-Agent: ESPN 403s "Gwuap/1.0 (+https://gwuap.co)"
      // while accepting the default, curl's, or a browser's. Took a
      // header-by-header comparison to find, because every failure here
      // is swallowed into an empty rail by design.
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    const data = await res.json()

    if (path.startsWith('tennis/') || path.startsWith('mma/')) {
      return parseIndividual(data, league, full)
    }

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
        // Only while it's still a game you can bet on.
        markets: stateRaw === 'pre'
          ? parseMarkets(odds, side(away).code, side(home).code)
          : undefined,
        book: odds?.provider?.name ?? undefined,
      })
    }
    return games
  } catch {
    return []
  }
}

/** Games for one category. Empty list if the league has no scoreboard. */
export async function fetchGames(
  league: string, dates?: string, full = false,
): Promise<Game[]> {
  const paths = SCOREBOARDS[league]
  if (!paths) return []
  const batches = await Promise.all(paths.map(p => fetchPath(p, league, dates, full)))

  // Merged paths can return the same match twice — during a Grand Slam the
  // ATP and WTA endpoints both return the whole tournament, every draw
  // included. Ids are unique per match, so dedup on those. Soccer merges
  // genuinely different competitions, so nothing collides there.
  const seen = new Set<string>()
  const unique = batches.flat().filter(g => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  })
  return sortGames(unique)
}

function stamp(offsetDays: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * A window around today: finished games worth arguing about, and the
 * ones you can still bet. ESPN takes `dates=YYYYMMDD-YYYYMMDD`.
 *
 * Tennis is excluded from the range — its scoreboard is one event per
 * tournament carrying the whole draw already, so a date filter would
 * narrow it to nothing.
 */
/**
 * A window around today.
 *
 * Ten days forward rather than three, because a week isn't long enough
 * to catch a sport that plays weekly. On 4 September the NFL's whole
 * opening weekend sat outside a three-day window, so the busiest league
 * on the site had an empty page in the days before its season started —
 * exactly when people would come looking.
 */
export async function fetchGamesWindow(
  league: string, daysBack = 3, daysForward = 10,
): Promise<Game[]> {
  // Tennis gets the whole draw, not the handful the cards are capped to.
  // The cap exists so a Grand Slam doesn't flood the rail; a league page
  // asking for a window wants everything that's on.
  if (league === 'Tennis' || league === 'UFC') return fetchGames(league, undefined, true)
  return fetchGames(league, `${stamp(-daysBack)}-${stamp(daysForward)}`)
}

/** A merged rail across the leagues most likely to have something on. */
export async function fetchRailGames(limit = 16, leagues: string[] = RAIL_LEAGUES): Promise<Game[]> {
  const batches = await Promise.all(leagues.map(l => fetchGames(l)))

  // Interleave the leagues instead of sorting purely by time. On a
  // September afternoon a straight sort is fifteen baseball games and
  // nothing else, which reads as one sport rather than a live board.
  const queues = batches.map(b => sortGames(b))
  const mixed: Game[] = []
  for (let round = 0; mixed.length < limit; round++) {
    let added = false
    for (const queue of queues) {
      const game = queue[round]
      if (!game) continue
      mixed.push(game)
      added = true
      if (mixed.length >= limit) break
    }
    if (!added) break
  }
  return mixed
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
/**
 * The post form, filled in from a real market rather than from a guess.
 *
 * Everything the pick needs travels in the link — which side, which
 * line, and the price the book was showing — so the form has nothing to
 * ask and nothing to let someone quietly change.
 */
export function postHrefForMarket(game: Game, market: Market): string {
  const params = new URLSearchParams({ league: game.league, game: game.id, src: 'book' })
  if (game.startsAt) params.set('starts', game.startsAt)
  if (game.book) params.set('book', game.book)
  params.set('bet', market.kind)
  params.set('odds', market.odds)

  if (market.kind === 'total') {
    // A total is on the game, so it carries both teams and a direction.
    params.set('tag', `$${game.away.code}`)
    params.set('tag2', `$${game.home.code}`)
    params.set('dir', market.side)          // over | under
    if (market.line !== null) params.set('line', String(market.line))
  } else {
    const other = market.side === 'away' ? game.home.code : game.away.code
    // The spread is part of how the pick reads, the way a slip writes it.
    const written = market.line === null
      ? ''
      : ` ${market.line > 0 ? '+' : ''}${market.line}`
    params.set('tag', `$${market.code}${written}`)
    params.set('tag2', `$${other}`)
    params.set('dir', 'backing')
    if (market.line !== null) params.set('line', String(market.line))
  }

  return `/post/new?${params.toString()}`
}

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
      // Spread: the number is part of how the pick is written, and also
      // has to travel as a number so the pick can be settled later.
      params.set('bet', 'spread')
      primary = `${primary} ${figure}`
      const signed = parseFloat(figure.replace(/[^0-9.\-]/g, ''))
      if (Number.isFinite(signed)) params.set('line', String(signed))
    }
  }

  // Which fixture this is. Without it a pick is a cashtag and an opinion,
  // and there's no key to look a final score up by.
  params.set('game', game.id)
  // Kick-off travels too: it's what decides when the pick stops being
  // withdrawable.
  if (game.startsAt) params.set('starts', game.startsAt)
  if (game.overUnder != null) params.set('total', String(game.overUnder))

  params.set('tag', primary)
  params.set('tag2', secondary)
  return `/post/new?${params.toString()}`
}


/**
 * Live detail for one game. ESPN's summary endpoint carries the score by
 * period, the current situation, odds and broadcast — everything a
 * scoreboard tap should reveal.
 */
/**
 * The numbers the book published for a game, read after the fact.
 *
 * The scoreboard drops a game's odds once it finishes — every MLB final
 * comes back with overUnder null — which is exactly when the grading job
 * needs them. The summary endpoint's pickcenter keeps them: a game
 * finished hours ago still reports total 8.0 and spread -1.5.
 *
 * So this is the honest record of what was on offer, available at grade
 * time, and not something the person posting the pick can influence.
 */
export type BookLines = { total: number | null; spread: number | null }

export async function fetchBookLines(league: string, id: string): Promise<BookLines> {
  const path = espnPathFor(league)
  if (!path) return { total: null, spread: null }
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(id)}`,
      { next: { revalidate: 300 }, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return { total: null, spread: null }
    const data = await res.json()

    const num = (v: unknown) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    for (const entry of data?.pickcenter ?? []) {
      const total = num(entry?.overUnder)
      const spread = num(entry?.spread)
      if (total !== null || spread !== null) return { total, spread }
    }
    return { total: null, spread: null }
  } catch {
    return { total: null, spread: null }
  }
}

async function fetchSummaryDetail(league: string, id: string): Promise<GameDetail | null> {
  const path = espnPathFor(league)
  if (!path) return null
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(id)}`,
      { next: { revalidate: 30 }, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const data = await res.json()

    const competition = data?.header?.competitions?.[0]
    if (!competition) return null

    const stateRaw = competition?.status?.type?.state
    const competitors = competition?.competitors ?? []

    const sides = competitors.map((c: any) => ({
      code: c?.team?.abbreviation ?? c?.team?.shortDisplayName ?? '',
      name: c?.team?.displayName ?? '',
      score: c?.score ?? null,
      record: c?.record?.[0]?.displayValue ?? null,
      byPeriod: (c?.linescores ?? []).map((l: any) => String(l?.displayValue ?? l?.value ?? '')),
      // The summary nests logos differently from the scoreboard.
      logo: c?.team?.logos?.[0]?.href ?? c?.team?.logo ?? null,
    }))
    // Away first, to read the way a scoreboard is written.
    const ordered = competitors[0]?.homeAway === 'home' ? [...sides].reverse() : sides

    const longest = Math.max(0, ...ordered.map((s: any) => s.byPeriod.length))
    const periods = Array.from({ length: longest }, (_, i) => String(i + 1))

    const pick = data?.pickcenter?.[0]
    const odds: { label: string; value: string }[] = []
    if (pick?.details) odds.push({ label: 'Line', value: String(pick.details) })
    if (typeof pick?.overUnder === 'number') odds.push({ label: 'O/U', value: String(pick.overUnder) })

    return {
      league,
      id,
      status: competition?.status?.type?.detail ?? '',
      state: stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre',
      periods,
      sides: ordered,
      odds,
      summary: null,
      // situation.lastPlay only exists for some sports; the plays array is
      // the reliable source and carries a type label worth showing.
      lastPlay: competition?.situation?.lastPlay?.text
        ?? [...(data?.plays ?? [])].reverse().find((p: any) => p?.text)?.text
        ?? null,
      lastPlayKind: [...(data?.plays ?? [])].reverse().find((p: any) => p?.text)?.type?.text ?? null,
      venue: data?.gameInfo?.venue?.fullName ?? null,
      broadcast: data?.header?.competitions?.[0]?.broadcasts?.[0]?.media?.shortName
        ?? data?.broadcasts?.[0]?.media?.shortName ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Build a detail view out of a scoreboard row. Less than the summary gives
 * us — no box score, no last play — but it has the teams, the score and the
 * line, which is enough for a real page.
 */
function detailFromGame(league: string, game: Game): GameDetail {
  const side = (s: GameSide) => ({
    code: s.code,
    name: s.name,
    score: s.score != null ? String(s.score) : null,
    record: null,
    byPeriod: s.byPeriod ?? [],
    logo: s.logo ?? null,
    label: s.label,
  })
  const odds: { label: string; value: string }[] = []
  if (game.spread) odds.push({ label: 'Line', value: String(game.spread) })
  if (typeof game.overUnder === 'number') odds.push({ label: 'O/U', value: String(game.overUnder) })

  // Column headings only where there's something to head: tennis sets.
  const longest = Math.max(0, game.away.byPeriod?.length ?? 0, game.home.byPeriod?.length ?? 0)

  // "Women's Singles · 2nd Round" ahead of the time or the result, so a
  // tennis page says what the match actually is.
  const context = [game.draw, game.round].filter(Boolean).join(' · ')

  return {
    league,
    id: game.id,
    status: context ? `${context} · ${game.status}` : game.status,
    state: game.state,
    periods: Array.from({ length: longest }, (_, i) => String(i + 1)),
    sides: [side(game.away), side(game.home)],
    odds,
    summary: game.note ?? null,
    lastPlay: null,
    lastPlayKind: null,
    venue: game.court ?? null,
    broadcast: null,
  }
}

/**
 * The summary endpoint is the good source, but it doesn't cover everything.
 * Tennis is the clear case: matches are competitions nested inside a
 * tournament event, and `summary?event=` only accepts event ids, so it
 * answers 400 for every match id we hold. That made every tennis card
 * open a 404 even though the scoreboard behind it was correct.
 *
 * So fall back to the scoreboard row whenever the summary can't answer.
 * This is deliberately not tennis-specific — any game ESPN has no summary
 * for now renders instead of 404ing.
 */
export async function fetchGameDetail(league: string, id: string): Promise<GameDetail | null> {
  const detail = await fetchSummaryDetail(league, id)
  if (detail) return detail

  const game = (await fetchGames(league, undefined, true)).find(g => g.id === id)
  return game ? detailFromGame(league, game) : null
}

/**
 * When a game starts, split so the two halves can be weighted differently.
 *
 * ESPN writes it as "9/13 - 1:00 PM EDT", which buries the time — the
 * part people actually plan around — inside a string where every
 * character has the same weight. The timestamp is cleaner to read from.
 *
 * Anchored to Eastern because that's the timezone ESPN quotes and where
 * the games are; a US audience reads "1:00 PM" as the kickoff they'd see
 * quoted anywhere else.
 */
const GAME_TZ = 'America/New_York'

export function kickoff(startsAt: string | null, now: Date = new Date()): { day: string; time: string } | null {
  if (!startsAt) return null
  const d = new Date(startsAt)
  if (Number.isNaN(d.getTime())) return null

  // en-CA gives YYYY-MM-DD, which compares as a string.
  const dayKey = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: GAME_TZ })
  const tomorrow = new Date(now.getTime() + 86_400_000)

  const key = dayKey(d)
  const day =
    key === dayKey(now) ? 'Today'
    : key === dayKey(tomorrow) ? 'Tomorrow'
    : d.toLocaleDateString('en-US', { timeZone: GAME_TZ, weekday: 'short', month: 'numeric', day: 'numeric' })

  const time = d.toLocaleTimeString('en-US', {
    timeZone: GAME_TZ, hour: 'numeric', minute: '2-digit',
  })

  return { day, time }
}

/** Where a game card points: the detail view, which is also where you post from. */
export function gameHref(game: Game): string {
  return `/game/${encodeURIComponent(game.league)}/${encodeURIComponent(game.id)}`
}
