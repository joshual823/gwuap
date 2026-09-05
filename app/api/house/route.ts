import { createAdminClient } from '@/lib/supabaseServer'
import { fetchGamesWindow, type Game, type Market } from '@/lib/scores'
import { LEAGUES_WITH_SCORES } from '@/lib/scores'

export const dynamic = 'force-dynamic'

/**
 * The house account posts a pick.
 *
 * Runs on a schedule so a new site's timeline has something on it. It is
 * not pretending to be anyone: the account carries is_bot, every post it
 * makes is labelled, and it can't reach the leaderboard or the contest.
 *
 * Its picks are graded by the same job as everyone else's, from the same
 * scoreboard, and its record is public. If the model goes 4-6 that's
 * what people will see — which is the only version of this worth
 * shipping, and the reason it's a feature rather than a trick.
 */

/** A couple per run, so an hourly schedule reads as a person's cadence. */
const PICKS_PER_RUN = 2

/** Only what a final score can settle, and only from a posted price. */
function marketToPick(game: Game, market: Market) {
  const otherCode = market.side === 'away' ? game.home.code : game.away.code
  if (market.kind === 'total') {
    return {
      tag: `$${game.away.code}`,
      tag2: `$${game.home.code}`,
      sentiment: market.side === 'over' ? 'over' : 'under',
      bet_type: 'total' as const,
      line: market.line,
    }
  }
  return {
    tag: `$${market.code}`,
    tag2: `$${otherCode}`,
    sentiment: 'backing',
    bet_type: market.kind,
    line: market.kind === 'spread' ? market.line : null,
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured' }, { status: 503 })
  }

  const supabase = createAdminClient()

  // Leagues are a name here and an id in the posts table, so the whole
  // list is read once rather than guessed at.
  const { data: cats } = await supabase.from('categories').select('id, name')
  const categoryFor = new Map((cats ?? []).map(c => [c.name as string, c.id as number]))

  const { data: house } = await supabase
    .from('profiles').select('id, username').eq('is_bot', true).limit(1).maybeSingle()
  if (!house) {
    return Response.json({
      error: 'No account is flagged is_bot. Create one through signup, then ' +
             "run: update profiles set is_bot = true where username = '<name>';",
    }, { status: 412 })
  }

  // Leagues rotate by the hour so it doesn't post ten NFL picks in a row
  // on a Sunday and nothing else all week.
  const hour = new Date().getUTCHours()
  const leagues = [...LEAGUES_WITH_SCORES]
  const ordered = [...leagues.slice(hour % leagues.length), ...leagues.slice(0, hour % leagues.length)]

  // Never twice on the same fixture, and never on one already under way.
  const { data: existing } = await supabase
    .from('posts').select('game_id').eq('author_id', house.id).not('game_id', 'is', null)
  const taken = new Set((existing ?? []).map(r => r.game_id))

  const posted: string[] = []
  for (const league of ordered) {
    if (posted.length >= PICKS_PER_RUN) break

    let games: Game[] = []
    try { games = await fetchGamesWindow(league, 0, 3) } catch { continue }

    const candidates = games.filter(g =>
      g.state === 'pre' &&
      !taken.has(g.id) &&
      (g.markets?.length ?? 0) > 0 &&
      g.startsAt && Date.parse(g.startsAt) > Date.now(),
    )

    const categoryId = categoryFor.get(league)
    // No category, no post: the column is NOT NULL and a league the
    // table has never heard of is a bug worth noticing, not papering over.
    if (categoryId === undefined) continue

    for (const game of candidates) {
      if (posted.length >= PICKS_PER_RUN) break
      const market = game.markets![Math.floor(hour + posted.length) % game.markets!.length]
      if (!market) continue
      const pick = marketToPick(game, market)
      if (!pick.tag || pick.tag === '$') continue

      const { error } = await supabase.from('posts').insert({
        author_id: house.id,
        category_id: categoryId,
        post_kind: 'pick',
        tag: pick.tag,
        tag2: pick.tag2,
        sentiment: pick.sentiment,
        bet_type: pick.bet_type,
        line: pick.line,
        // The book's number, kept as a fact about the market. No stake:
        // the house isn't claiming to have money on anything.
        odds: market.odds,
        odds_source: 'book',
        odds_book: game.book ?? null,
        money_public: true,
        game_id: game.id,
        game_league: game.league,
        game_starts_at: game.startsAt,
        caption: `${market.label} — ${game.away.code} at ${game.home.code}. Graded from the final score like everyone else's.`,
      })
      if (error) continue
      taken.add(game.id)
      posted.push(`${league}:${game.id} ${market.label}`)
    }
  }

  return Response.json({ account: house.username, posted: posted.length, picks: posted })
}
