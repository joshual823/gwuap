'use client'
import { useEffect, useState } from 'react'
import type { Market } from '@/lib/scores'

export type Slim = {
  id: string; league: string; state: string; status: string; startsAt: string | null
  away: { code: string; label: string; logo: string | null }
  home: { code: string; label: string; logo: string | null }
  markets: Market[]; book: string | null
}

/**
 * Games matching what someone has typed, offered as taps.
 *
 * The form has always been able to take a pick from a game card; this
 * puts the same thing where people actually start, which is the Post
 * button. Once a league and a cashtag are in, the fixtures that match
 * are usually one or two — so the choice stays short rather than
 * becoming a second scoreboard inside a form.
 */
export default function GamePicker({ league, query, onSelect, onSelectGame, selectedGameId }: {
  league: string | null
  query: string
  /** Fill the form in place. A link would reload the page and lose
      everything already typed into it. */
  onSelect: (game: Slim, market: Market) => void
  /** Attach the fixture without choosing a price. The only route for a
      bet type no book prices — a first-inning pick had no way to name a
      game at all before this. */
  onSelectGame: (game: Slim) => void
  selectedGameId: string | null
}) {
  const [games, setGames] = useState<Slim[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!league) { setGames(null); return }
    let cancelled = false
    fetch(`/api/games?league=${encodeURIComponent(league)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setGames(d.games ?? []) })
      .catch(() => { if (!cancelled) setGames([]) })
    return () => { cancelled = true }
  }, [league])

  if (!games || games.length === 0) return null

  // Match on the code people type, with or without the dollar sign.
  const needle = query.replace(/^\$/, '').trim().toUpperCase()
  const matches = needle.length >= 1
    ? games.filter(g => g.away.code.toUpperCase().startsWith(needle) || g.home.code.toUpperCase().startsWith(needle))
    : games
  const shown = matches.slice(0, needle ? 4 : 3)
  if (shown.length === 0) return null

  return (
    <div className="picker">
      <p className="picker-head">
        {needle ? 'Matching games' : 'Coming up'} — tap to fill this in
      </p>
      {shown.map(g => (
        <div key={g.id} className="picker-game">
          {/* Tapping the game picks the game. It used to only expand the
              prices underneath, so the teams stayed as whatever had been
              typed — you could tap "ARI @ HOU" and still post ARI vs ATL. */}
          <button
            type="button"
            className={`picker-row ${selectedGameId === g.id ? 'chosen' : ''}`}
            onClick={() => { onSelectGame(g); setOpen(o => o === g.id ? null : g.id) }}
          >
            <span className="picker-teams">{g.away.label} @ {g.home.label}</span>
            <span className="picker-when">
              {selectedGameId === g.id ? '✓ Using this' : g.state === 'in' ? 'LIVE' : g.status}
            </span>
          </button>

          {open === g.id && (
            g.markets.length > 0 ? (
              <div className="picker-markets">
                {g.markets.map(m => (
                  <button key={`${m.kind}-${m.side}`} type="button" className="market-btn"
                    onClick={() => { onSelect(g, m); setOpen(null) }}>
                    <span className="market-pick">{m.label}</span>
                    <span className="market-odds">{m.odds}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="picker-none">
                No posted prices for this one. The game is attached, so it&apos;ll
                still grade itself — enter your own odds below.
              </p>
            )
          )}
        </div>
      ))}
    </div>
  )
}
