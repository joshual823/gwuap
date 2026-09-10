import { fetchGamesWindow, RAIL_LEAGUES } from '@/lib/scores'

export const dynamic = 'force-dynamic'

/**
 * Which teams are actually playing, for the $ autocomplete.
 *
 * Typing "$DET" used to offer the Detroit teams from a curated list and
 * anything anyone had posted before, in no particular order — which is
 * the same answer in July as it is ten minutes before first pitch. What
 * somebody typing a cashtag into a squad room almost always means is the
 * game that's on now, or the one about to start.
 *
 * Public and read-only: it returns the fixtures the scores pages already
 * show to anyone.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '')
    .replace(/^\$/, '').trim().toUpperCase()

  const batches = await Promise.all(
    RAIL_LEAGUES.map(l => fetchGamesWindow(l, 0, 2).catch(() => [])),
  )

  type Row = { code: string; label: string; state: string; rank: number }
  const seen = new Map<string, Row>()

  for (const game of batches.flat()) {
    // Live first, then whatever starts soonest. A finished game is still
    // worth completing — people talk about them — but never above one
    // that hasn't happened.
    const starts = game.startsAt ? Date.parse(game.startsAt) : Number.MAX_SAFE_INTEGER
    const rank = game.state === 'in' ? 0 : game.state === 'pre' ? 1 : 2

    for (const [side, other] of [[game.away, game.home], [game.home, game.away]] as const) {
      if (!side.code) continue
      const code = side.code.toUpperCase()
      const label = game.state === 'in'
        ? `LIVE · ${game.away.code} @ ${game.home.code}`
        : game.state === 'pre'
          ? `vs ${other.code}`
          : `final · ${game.away.code} @ ${game.home.code}`
      const row: Row = { code, label, state: game.state, rank: rank * 1e13 + starts }
      const held = seen.get(code)
      if (!held || row.rank < held.rank) seen.set(code, row)
    }
  }

  const all = [...seen.values()].sort((a, b) => a.rank - b.rank)
  const matches = q ? all.filter(r => r.code.startsWith(q)) : all

  return Response.json({
    teams: matches.slice(0, 6).map(r => ({ code: r.code, detail: r.label })),
  })
}
