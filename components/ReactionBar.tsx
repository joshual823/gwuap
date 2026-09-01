'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { REACTION_EMOJI, DEFAULT_REACTION, type ReactionCount } from '@/lib/reactions'

const HOLD_MS = 450

/** Posts and comments store reactions in parallel tables. */
const TARGETS = {
  post: { table: 'likes', column: 'post_id' },
  comment: { table: 'comment_reactions', column: 'comment_id' },
} as const

/**
 * Tap to react with a heart, press and hold to pick any reaction.
 *
 * One reaction per person per target — both tables are keyed on
 * (user_id, <target>_id), so choosing a new emoji replaces your old one
 * rather than stacking. Tapping your own reaction again removes it.
 */
export default function ReactionBar({
  targetKind, targetId, initialCounts, initialMine, viewerId, compact = false,
}: {
  targetKind: 'post' | 'comment'
  targetId: string
  initialCounts: ReactionCount[]
  initialMine: string | null
  viewerId: string | null
  compact?: boolean
}) {
  const { table, column } = TARGETS[targetKind]
  const supabase = createClient()
  const router = useRouter()
  const [counts, setCounts] = useState<ReactionCount[]>(initialCounts)
  const [mine, setMine] = useState<string | null>(initialMine)
  const [pickerOpen, setPickerOpen] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHold = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('touchstart', onDocDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('touchstart', onDocDown)
    }
  }, [])

  /** Recompute the visible tally after a local change, without a round trip. */
  function applyLocal(previous: string | null, next: string | null) {
    setCounts(current => {
      const map = new Map(current.map(c => [c.emoji, c.count]))
      if (previous) {
        const n = (map.get(previous) ?? 1) - 1
        if (n <= 0) map.delete(previous); else map.set(previous, n)
      }
      if (next) map.set(next, (map.get(next) ?? 0) + 1)
      return [...map.entries()]
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
    })
    setMine(next)
  }

  async function react(emoji: string | null) {
    if (!viewerId) { router.push('/login'); return }
    const previous = mine
    applyLocal(previous, emoji)
    setPickerOpen(false)

    const { error } = emoji === null
      ? await supabase.from(table).delete().match({ user_id: viewerId, [column]: targetId })
      : await supabase.from(table)
          .upsert({ user_id: viewerId, [column]: targetId, emoji }, { onConflict: `user_id,${column}` })

    // Roll the optimistic update back if the write didn't land.
    if (error) applyLocal(emoji, previous)
  }

  function toggleDefault() {
    react(mine ? null : DEFAULT_REACTION)
  }

  function startHold() {
    didHold.current = false
    holdTimer.current = setTimeout(() => {
      didHold.current = true
      setPickerOpen(true)
    }, HOLD_MS)
  }

  function endHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    // A hold already opened the picker; don't also fire the tap action.
    if (!didHold.current) toggleDefault()
    didHold.current = false
  }

  function cancelHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    didHold.current = false
  }

  return (
    <div className={`reaction-wrap ${compact ? 'compact' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={`action-btn react-btn ${mine ? 'reacted' : ''}`}
        aria-label={mine ? 'Change or remove your reaction' : 'React'}
        aria-haspopup="true"
        aria-expanded={pickerOpen}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={e => e.preventDefault()}
      >
        <span className="react-emoji">{mine ?? '♡'}</span>
      </button>

      {counts.map(c => (
        <button
          key={c.emoji}
          type="button"
          className={`reaction-chip ${mine === c.emoji ? 'mine' : ''}`}
          onClick={() => react(mine === c.emoji ? null : c.emoji)}
          aria-label={`${c.count} ${c.emoji} reactions`}
        >
          <span>{c.emoji}</span> {c.count}
        </button>
      ))}

      {pickerOpen && (
        <div className="reaction-picker" role="menu">
          {REACTION_EMOJI.map(e => (
            <button
              key={e}
              type="button"
              role="menuitem"
              className={`reaction-pick ${mine === e ? 'mine' : ''}`}
              onClick={() => react(e)}
              aria-label={`React with ${e}`}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}
