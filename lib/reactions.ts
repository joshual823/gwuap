// Reaction emoji.
//
// A web page can't open the iPhone system emoji keyboard — there's no
// API for it, it's part of the native keyboard UI. So like Slack,
// Discord, and Notion, we ship our own grid. A curated set that fits
// betting also reads better than 3,700 emoji nobody scrolls through.

export const DEFAULT_REACTION = '♥'

export const REACTION_EMOJI = [
  // the tap default first
  '♥', '🔥', '💰', '📈', '🎯', '😂',
  '💀', '📉', '🤡', '🧊', '😭', '😤',
  '👀', '🧂', '🙏', '💯', '⚡', '👑',
  '🤝', '🧠', '🚀', '📊', '🥶', '😮',
  '👏', '🫡', '🤞', '😬', '🤔', '🙄',
  '💸', '🏆', '🐐', '🤮', '☠️', '🎰',
  '🛎️', '📌', '🔒', '⚠️', '❄️', '🌊',
  '😅', '🤯', '😴', '🫠', '💔', '🍀',
]

export type ReactionCount = { emoji: string; count: number }

/** Group raw reaction rows into counts, most-used first. */
export function tallyReactions(rows: { emoji: string | null }[]): ReactionCount[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const e = r.emoji || DEFAULT_REACTION
    counts.set(e, (counts.get(e) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
}
