import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGames, fetchGamesWindow, LEAGUES_WITH_SCORES } from '@/lib/scores'
import GameGrid from '@/components/GameGrid'
import GameCard from '@/components/GameCard'

export const dynamic = 'force-dynamic'

export default async function LeagueScoresPage(props: { params: Promise<{ league: string }> }) {
  const params = await props.params
  const league = decodeURIComponent(params.league)
  if (!LEAGUES_WITH_SCORES.includes(league)) notFound()

  // Out of season the window finds nothing — the NBA's next game in
  // early September is a month away — and the overview already falls
  // back to whatever ESPN considers current. Without the same fallback
  // here, a league showed a card on the home page and an empty page
  // behind it, which reads as broken rather than as out of season.
  const windowed = await fetchGamesWindow(league)
  const games = windowed.length > 0 ? windowed : await fetchGames(league)
  const live = games.filter(g => g.state === 'in')
  // A Grand Slam draw is a couple of hundred unplayed matches stretching a
  // fortnight out. Sorted soonest-first, so this is roughly the next two
  // days of play rather than an arbitrary slice of the draw.
  const upcoming = games.filter(g => g.state === 'pre').slice(0, 60)
  // Three days of baseball is ~90 finished games. Nobody scrolls that.
  const recent = games.filter(g => g.state === 'post').reverse().slice(0, 24)

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/scores" className="back-link">← All scores</Link>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 2px' }}>{league}</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 8 }}>
        Tap any game for live detail and to post a pick.
      </p>

      {games.length === 0 && (
        <p style={{ color: 'var(--ink-dim)', marginTop: 16 }}>
          No {league} games in the last few days or the next few.
        </p>
      )}

      {/* Live games are never many and are the reason to be here, so they
          all show. The other two sections can run to dozens, so they
          reveal in batches rather than making the page a mile long. */}
      {live.length > 0 && <h2 className="comments-heading">Live now</h2>}
      {live.length > 0 && <div className="game-grid">
        {live.map(g => <GameCard game={g} key={g.id} className="game-tile" />)}
      </div>}

      {upcoming.length > 0 && <h2 className="comments-heading">Starting soon</h2>}
      {upcoming.length > 0 && <GameGrid games={upcoming} />}

      {recent.length > 0 && <h2 className="comments-heading">Last few days</h2>}
      {recent.length > 0 && <GameGrid games={recent} />}
    </div>
  )
}
