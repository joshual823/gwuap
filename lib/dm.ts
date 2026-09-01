/**
 * Conversations store their pair in a canonical order (user_a < user_b)
 * with a unique constraint, so A→B and B→A can't become two separate
 * threads. Both sides have to sort the pair the same way before writing.
 */
export function orderedPair(x: string, y: string): { user_a: string; user_b: string } {
  return x < y ? { user_a: x, user_b: y } : { user_a: y, user_b: x }
}

export function otherParticipant<T extends { id: string }>(
  a: T | null, b: T | null, me: string,
): T | null {
  if (a && a.id !== me) return a
  if (b && b.id !== me) return b
  return a ?? b
}
