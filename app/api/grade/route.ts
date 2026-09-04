import { createAdminClient } from '@/lib/supabaseServer'
import { fetchBookLines, fetchGamesWindow, type Game } from '@/lib/scores'
import { gradePick, needsReview, GRADEABLE_BET_TYPES, PERIOD_TOTAL_SHARE } from '@/lib/grade'
import { profitForStatus, pricingNeedsReview } from '@/lib/odds'

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
  try {
    return await run(request)
  } catch (e: any) {
    // Same reasoning: the job runs unattended, so the log line has to be
    // enough to act on without reproducing it.
    return Response.json({ error: `Grading threw: ${e?.message ?? String(e)}` }, { status: 500 })
  }
}

async function run(request: Request) {
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

  // Checked rather than assumed. createAdminClient throws on a missing
  // key, which reaches the caller as a bare 500 with nothing in it —
  // and a scheduled job that fails without saying why is the exact
  // failure this endpoint exists to prevent.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set in this environment. ' +
             'Add it to Vercel for Production and redeploy.',
    }, { status: 503 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return Response.json({
      error: 'NEXT_PUBLIC_SUPABASE_URL is not set in this environment.',
    }, { status: 503 })
  }

  const supabase = createAdminClient()

  // 30 days matches the leaderboard window. Older pending picks can no
  // longer affect anyone's rank, and their scoreboards have aged out of
  // ESPN's feed anyway.
  const { data: pending, error } = await supabase
    .from('posts')
    .select('id, bet_type, sentiment, ticker, line, odds, stake, game_id, game_league, created_at')
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

  // Marks a pick as needing a human. Written on the row rather than only
  // into this response, because the response is a log line nobody reads
  // and the admin queue is a page somebody does.
  let flagged = 0
  let voided = 0
  const flag = async (id: string, reason: string) => {
    flagged++
    await supabase
      .from('posts')
      .update({ grade_note: reason, grade_checked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
  }

  // The scoreboard drops a game's odds the moment it finishes, which is
  // exactly when this job looks at it. Anything whose line has to be
  // checked gets the published numbers from pickcenter instead, once per
  // game however many picks are on it.
  const linesNeeded = (betType: string) =>
    betType === 'total' || betType === 'spread' || betType in PERIOD_TOTAL_SHARE
  const bookCache = new Map<string, Awaited<ReturnType<typeof fetchBookLines>>>()

  for (const pick of pending) {
    let game = byLeague.get(pick.game_league as string)?.get(pick.game_id as string)
    if (!game) { note('game not on the scoreboard'); continue }

    if (linesNeeded(pick.bet_type) && game.overUnder == null) {
      const key = `${pick.game_league}:${pick.game_id}`
      if (!bookCache.has(key)) {
        bookCache.set(key, await fetchBookLines(pick.game_league as string, pick.game_id as string))
      }
      const lines = bookCache.get(key)!
      game = {
        ...game,
        overUnder: game.overUnder ?? lines.total,
        spread: game.spread ?? (lines.spread == null ? null : String(lines.spread)),
      }
    }

    const result = gradePick({
      betType: pick.bet_type,
      sentiment: pick.sentiment,
      ticker: pick.ticker,
      line: pick.line == null ? null : Number(pick.line),
      // The scoreboard's kick-off decides whether this was late, but the
      // row is the only place the posting time exists.
      createdAt: pick.created_at,
    }, game)

    if ('blocked' in result) {
      note(result.blocked)
      // A pick posted after the game got going is settled, not stuck: it
      // voids. Void counts as neither a win nor a loss anywhere, so the
      // pick stands as an opinion and touches nobody's record — and it
      // doesn't sit in the review queue asking a person to decide
      // something already decided.
      if (result.blocked === 'late-entry') {
        await supabase
          .from('posts')
          .update({
            status: 'void', profit: 0, graded_at: new Date().toISOString(),
            graded_by: 'auto', grade_note: 'late-entry',
          })
          .eq('id', pick.id)
          .eq('status', 'pending')
        voided++
        continue
      }
      // A game that hasn't finished is the system working, so it isn't
      // worth a note on the row. Anything else will sit pending forever
      // unless a person looks at it, so it gets flagged for review.
      if (needsReview(result.blocked)) await flag(pick.id, result.blocked)
      continue
    }

    const outcome = result.outcome
    // Null when no money was staked, which is now the ordinary case.
    // The pick still settles; it just carries no dollar figure.
    const profit = profitForStatus(outcome, pick.odds, pick.stake)
    // A win we staked money on and can't price is a data problem, not a
    // result — leave it pending for review rather than booking $0
    // against somebody's record. A win with no money on it is not that:
    // it's most picks on the site, and it grades like any other.
    if (pricingNeedsReview(outcome, pick.odds, pick.stake)) {
      note('could not price the payout')
      await flag(pick.id, 'unpriceable')
      continue
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({
        status: outcome, profit, graded_at: new Date().toISOString(),
        graded_by: 'auto', grade_note: null,
      })
      .eq('id', pick.id)
      .eq('status', 'pending')     // never regrade something already settled

    if (updateError) { note('write failed'); continue }
    results.push({ id: pick.id, status: outcome })
  }

  return Response.json({
    checked: pending.length,
    graded: results.length,
    flaggedForReview: flagged,
    voidedAsLate: voided,
    byOutcome: results.reduce((m: Record<string, number>, r) => {
      m[r.status] = (m[r.status] ?? 0) + 1
      return m
    }, {}),
    skipped,
  })
}
