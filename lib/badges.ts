/**
 * Earned standing, shown next to a name.
 *
 * Kept small on purpose. A badge is worth something because it's rare
 * and can't be granted to yourself; a wall of them next to every
 * username would be worth nothing.
 */
export const FOUNDING_LIMIT = 200

export type BadgeId = 'founding'

type Badge = { id: BadgeId; label: string; title: string; tone: 'founder' }

export const BADGES: Record<BadgeId, Badge> = {
  founding: {
    id: 'founding',
    label: 'Founding member',
    // Deliberately says what it is rather than how long it lasts.
    // Promising "permanent" or "never again" is a commitment to a
    // decision nobody has had to make yet, and taking it back later
    // costs more than the word was ever worth.
    title: `One of the first ${FOUNDING_LIMIT} accounts on Gwuap.`,
    tone: 'founder',
  },
}

/** Unknown ids are dropped rather than rendered — the column is text[]. */
export function badgesOf(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((b): b is BadgeId => typeof b === 'string' && b in BADGES)
    .map(b => BADGES[b])
}
