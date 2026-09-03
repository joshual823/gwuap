import { createAdminClient } from '@/lib/supabaseServer'
import { fetchGamesWindow, type Game } from '@/lib/scores'
import { gradePick, GRADEABLE_BET_TYPES } from '@/lib/grade'
import { profitForStatus } from '@/lib/odds'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Settles pending picks against the final score of the game they name.
 *
 * Runs on a schedule (see vercel.json) rather than on request, because
 * grading is the one thing on this site that has to happen whether or
 * not anybody is looking at it.
 *
 * Daily at 08:00 UTC — 4am Eastern, after even a west-coast night game
 * has finished. Not because daily is ideal, but because Vercel's Hobby
 * plan rejects any cron that would run more than once a day, and a
 * more frequent expression fails the deployment outright. On Pro this
 * becomes hourly by editing one line in vercel.json.
 *
 * Two rules it never breaks:
 *   - It only ever moves a pick out of 'pending'. Nothing already graded
 *     is touched, so a re-run can't rewrite history and a bug can't
 *     cascade through old records.
 *   - When it isn't sure, it does nothing. gradePick returns null for
 *     anything it can't settle and those picks stay pending. Grading a
 *     pick wrongly is far worse than grading it late.
 */
export async function GET(request: Request) {
  // Vercel Cron sends this header. Without the secret configured the
  // endpoint stays shut rather than falling open — it can write to every
  // record on the site.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 30 days matches the leaderboard window. Older pending picks can no
  // longer affect anyone's rank, and their scoreboards have aged out of
  // ESPN's feed anyway.
  const { data: pending, error } = await supabase
    .from('posts')
    .select('id, bet_type, sentiment, ticker, line, odds, stake, game_id, game_league')
    .eq('status', 'pending')
    .eq('post_kind', 'pick')
    .not('game_id', 'is', null)
    .in('bet_type', GRADEABLE_BET_TYPES)
    .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
    .limit(500)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!pending?.length) return Response.json({ checked: 0, graded: 0 })

  // One fetch per league, not per pick. Fifty picks on the same Sunday
  // slate is one call to the NFL scoreboard.
  //
  // The window matters more than it looks. ESPN's scoreboard returns the
  // current day unless asked otherwise, and this runs at 4am Eastern —
  // by which point last night's games have rolled off "today" and would
  // never be found. Four days back covers a weekend plus a slow run.
  const leagues = [...new Set(pending.map(p => p.game_league).filter(Boolean) as string[])]
  const byLeague = new Map<string, Map<string, Game>>()
  await Promise.all(leagues.map(async league => {
    const games = await fetchGamesWindow(league, 4, 1)
    byLeague.set(league, new Map(games.map(g => [g.id, g])))
  }))

  const results: { id: string; status: string }[] = []
  const skipped: Record<string, number> = {}
  const note = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }

  for (const pick of pending) {
    const game = byLeague.get(pick.game_league as string)?.get(pick.game_id as string)
    if (!game) { note('game not on the scoreboard'); continue }

    const outcome = gradePick({
      betType: pick.bet_type,
      sentiment: pick.sentiment,
      ticker: pick.ticker,
      line: pick.line == null ? null : Number(pick.line),
    }, game)

    if (!outcome) { note('not settled yet'); continue }

    const profit = profitForStatus(outcome, pick.odds, pick.stake)
    // A win we can't price is a data problem, not a result. Leave it
    // pending and let it show up as ungraded rather than booking $0.
    if (profit === null && outcome !== 'void') { note('could not price the payout'); continue }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ status: outcome, profit, graded_at: new Date().toISOString(), graded_by: 'auto' })
      .eq('id', pick.id)
      .eq('status', 'pending')     // never regrade something already settled

    if (updateError) { note('write failed'); continue }
    results.push({ id: pick.id, status: outcome })
  }

  return Response.json({
    checked: pending.length,
    graded: results.length,
    byOutcome: results.reduce((m: Record<string, number>, r) => {
      m[r.status] = (m[r.status] ?? 0) + 1
      return m
    }, {}),
    skipped,
  })
}
