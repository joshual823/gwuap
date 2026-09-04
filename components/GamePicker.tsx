'use client'
import { useEffect, useState } from 'react'
import type { Market } from '@/lib/scores'
import { wordsFor } from '@/lib/sportWords'

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
  const [showAll, setShowAll] = useState(false)
  const words = wordsFor(league)

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

  // Only fixtures that haven't started. A pick on a game already under
  // way can't count — the result is partly known — so offering one here
  // would be offering something that gets refused on the way in.
  const upcoming = games.filter(g => g.state === 'pre')
  // Match on the code people type, with or without the dollar sign.
  const needle = query.replace(/^\$/, '').trim().toUpperCase()
  const matches = needle.length >= 1
    ? upcoming.filter(g => g.away.code.toUpperCase().startsWith(needle) || g.home.code.toUpperCase().startsWith(needle))
    : upcoming
  // A few by default so the form doesn't turn into a scoreboard, all of
  // them on request — with no needle typed there can be forty fixtures,
  // and scrolling past them to reach the rest of the form is worse than
  // one tap to see them.
  const limit = needle ? 4 : 3
  const shown = showAll ? matches : matches.slice(0, limit)
  const hidden = matches.length - shown.length
  if (shown.length === 0) return null

  return (
    <div className="picker">
      <p className="picker-head">
        {needle ? `Matching ${words.events}` : 'Coming up'} — tap to fill this in
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
              <div className="picker-kinds">
                {/* Grouped and labelled, the way a game page lays them
                    out. Ungrouped, "DET +113" and "DET +1.5" sat next to
                    each other with nothing saying which was the
                    moneyline and which was the spread. */}
                {(['moneyline', 'spread', 'total'] as const).map(kind => {
                  const row = g.markets.filter(m => m.kind === kind)
                  if (row.length === 0) return null
                  return (
                    <div className="market-row" key={kind}>
                      <span className="market-kind">
                        {kind === 'moneyline' ? 'Moneyline' : kind === 'spread' ? 'Spread' : 'Total'}
                      </span>
                      {row.map(m => (
                        <button key={`${m.kind}-${m.side}`} type="button" className="market-btn"
                          onClick={() => { onSelect(g, m); setOpen(null) }}>
                          <span className="market-pick">{m.label}</span>
                          <span className="market-odds">{m.odds}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="picker-none">
                No posted prices for this one. The {words.event} is attached, so
                it&apos;ll still grade itself — enter your own odds below.
              </p>
            )
          )}
        </div>
      ))}

      {hidden > 0 && (
        <button type="button" className="picker-more" onClick={() => setShowAll(true)}>
          Show {hidden} more {hidden === 1 ? words.event : words.events}
        </button>
      )}

      {showAll && league && (
        <a href={`/scores/${encodeURIComponent(league)}`} className="picker-all">
          Or browse every {league} {words.event} →
        </a>
      )}
    </div>
  )
}
