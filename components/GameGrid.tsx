'use client'
import { useState } from 'react'
import GameCard from './GameCard'
import type { Game } from '@/lib/scores'

/**
 * A league's games as cards rather than rows.
 *
 * Shows a first batch and reveals more on tap. The data is already here,
 * so "show more" is a slice rather than a fetch — no spinner, no request,
 * and the count is honest because it's counting what it holds.
 */
export default function GameGrid({ games, batch = 12 }: {
  games: Game[]
  batch?: number
}) {
  const [shown, setShown] = useState(batch)
  const visible = games.slice(0, shown)
  const remaining = games.length - visible.length

  return (
    <>
      <div className="game-grid">
        {visible.map(g => <GameCard game={g} key={g.id} className="game-tile" />)}
      </div>
      {remaining > 0 && (
        <button type="button" className="btn secondary grid-more"
          onClick={() => setShown(n => n + batch)}>
          Show {Math.min(batch, remaining)} more · {remaining} left
        </button>
      )}
    </>
  )
}
