import { fetchGames, LEAGUES_WITH_SCORES } from '@/lib/scores'
import Scoreboard from '@/components/Scoreboard'
import FeedTabs from '@/components/FeedTabs'

export const dynamic = 'force-dynamic'

export default async function ScoresPage() {
  const batches = await Promise.all(
    LEAGUES_WITH_SCORES.map(async league => ({ league, games: await fetchGames(league) })),
  )
  const withGames = batches.filter(b => b.games.length > 0)

  return (
    <div>
      <FeedTabs active="scores" />

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
