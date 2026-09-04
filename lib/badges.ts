/**
 * Earned standing, shown next to a name.
 *
 * Kept small on purpose. A badge is worth something because it's rare
 * and can't be granted to yourself; a wall of them next to every
 * username would be worth nothing.
 */
export const FOUNDING_LIMIT = 200

export type BadgeId = 'founding' | 'week1_champion'

type Badge = { id: BadgeId; label: string; title: string; tone: 'founder' | 'champion' }

export const BADGES: Record<BadgeId, Badge> = {
  founding: {
    id: 'founding',
    label: 'Founding member',
    title: `One of the first ${FOUNDING_LIMIT} people here. Never awarded again.`,
    tone: 'founder',
  },
  week1_champion: {
    id: 'week1_champion',
    label: 'Week 1 champion',
    title: 'Best verified record of the NFL Week 1 contest.',
    tone: 'champion',
  },
}

/** Unknown ids are dropped rather than rendered — the column is text[]. */
export function badgesOf(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((b): b is BadgeId => typeof b === 'string' && b in BADGES)
    .map(b => BADGES[b])
}
