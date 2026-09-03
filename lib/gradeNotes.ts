/**
 * Attach "why isn't this graded" to a list of posts.
 *
 * A separate query on purpose. Folding grade_note into the big post
 * selects means those selects fail until migration 024 runs, and they're
 * the queries the feed and every profile are built from — the same
 * mistake that briefly 404'd every profile page when preferred_leagues
 * was added. An error here just means no badges.
 */
export async function attachGradeNotes<T extends { id: string; status?: string; post_kind?: string }>(
  supabase: any,
  posts: T[],
): Promise<(T & { grade_note?: string | null })[]> {
  const waiting = posts.filter(p => p.status === 'pending' && p.post_kind === 'pick')
  if (waiting.length === 0) return posts

  const { data, error } = await supabase
    .from('posts')
    .select('id, grade_note')
    .in('id', waiting.map(p => p.id))

  if (error || !data) return posts

  const notes = new Map<string, string>(
    data.filter((r: any) => r.grade_note).map((r: any) => [r.id, r.grade_note]),
  )
  if (notes.size === 0) return posts

  return posts.map(p => (notes.has(p.id) ? { ...p, grade_note: notes.get(p.id) } : p))
}
