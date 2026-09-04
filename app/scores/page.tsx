import { fetchGames, fetchGamesWindow, LEAGUES_WITH_SCORES } from '@/lib/scores'
import Scoreboard from '@/components/Scoreboard'
import FeedTabs from '@/components/FeedTabs'
import LeagueNav from '@/components/LeagueNav'

export const dynamic = 'force-dynamic'

export default async function ScoresPage() {
  // A window, not just today. ESPN's "today" doesn't roll over until a
  // slate begins, so first thing in the morning this page led with last
  // night's finished games and nothing to bet on. sortGames puts live
  // first, then upcoming, then finished, so the twelve shown lead with
  // what's still to play.
  //
  // Out of season a window finds nothing at all — the NBA's next game in
  // early September is a month away — and a league silently vanishing
  // from the page is worse than showing it late. So an empty window
  // falls back to whatever ESPN considers current, which for a dormant
  // league is its next fixture.
  const batches = await Promise.all(
    LEAGUES_WITH_SCORES.map(async league => {
      const windowed = await fetchGamesWindow(league, 1, 10)
      const games = windowed.length > 0 ? windowed : await fetchGames(league)
      return { league, games }
    }),
  )
  const withGames = batches.filter(b => b.games.length > 0)

  return (
    <div>
      <FeedTabs active="scores" />

      <h1 className="page-title">Sports Live</h1>

      <LeagueNav />

      {withGames.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 20 }}>
          Nothing on right now. Check back closer to game time.
        </p>
      )}

      {withGames.map(({ league, games }) => (
        <Scoreboard
          key={league}
          games={games.slice(0, 12)}
          title={league}
          href={`/scores/${encodeURIComponent(league)}`}
          autoScroll={false}
        />
      ))}
    </div>
  )
}
