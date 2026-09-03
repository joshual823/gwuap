/**
 * Attach how a pick was settled, and why it wasn't.
 *
 * A separate query on purpose. Folding these into the big post selects
 * means those selects fail until the migration runs, and they're the
 * queries the feed and every profile are built from — the same mistake
 * that briefly 404'd every profile page when preferred_leagues was added.
 * An error here just means no badges.
 */
export type GradeMeta = { grade_note?: string | null; graded_by?: string | null }

export async function attachGradeNotes<T extends { id: string; post_kind?: string }>(
  supabase: any,
  posts: T[],
): Promise<(T & GradeMeta)[]> {
  const picks = posts.filter(p => p.post_kind === 'pick')
  if (picks.length === 0) return posts

  const { data, error } = await supabase
    .from('posts')
    .select('id, grade_note, graded_by')
    .in('id', picks.map(p => p.id))

  if (error || !data) return posts

  const meta = new Map<string, GradeMeta>(
    data
      .filter((r: any) => r.grade_note || r.graded_by)
      .map((r: any) => [r.id, { grade_note: r.grade_note, graded_by: r.graded_by }]),
  )
  if (meta.size === 0) return posts

  return posts.map(p => (meta.has(p.id) ? { ...p, ...meta.get(p.id) } : p))
}
