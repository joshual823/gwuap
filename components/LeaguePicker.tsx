'use client'
import { PICKABLE_LEAGUES, MAX_PREFERRED } from '@/lib/preferences'

/**
 * Choose up to three leagues. Controlled, so both the signup step and the
 * profile editor own the value and the saving.
 *
 * Selecting a fourth is refused rather than silently dropping the oldest
 * — quietly rearranging someone's choices reads as a bug.
 */
export default function LeaguePicker({ value, onChange, disabled }: {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const full = value.length >= MAX_PREFERRED

  function toggle(league: string) {
    if (value.includes(league)) onChange(value.filter(l => l !== league))
    else if (!full) onChange([...value, league])
  }

  return (
    <div className="league-picker">
      {PICKABLE_LEAGUES.map(league => {
        const on = value.includes(league)
        return (
          <button
            key={league}
            type="button"
            disabled={disabled || (full && !on)}
            aria-pressed={on}
            className={`league-chip ${on ? 'active' : ''}`}
            onClick={() => toggle(league)}
          >
            {league}
          </button>
        )
      })}
    </div>
  )
}
