/**
 * Everything a post card needs that doesn't live in the main post select.
 *
 * Separate queries on purpose. Folding these into the big selects means
 * those selects fail until the migration runs, and they're the queries
 * the feed and every profile are built from — the mistake that briefly
 * 404'd every profile page when preferred_leagues was added. A failure
 * here costs a badge or a quoted card, and nothing else.
 */
export type PostMeta = {
  grade_note?: string | null
  graded_by?: string | null
  odds_source?: string | null
  odds_book?: string | null
  money_public?: boolean | null
  repost_of?: string | null
  game_starts_at?: string | null
  reposted?: any | null      // the post being passed along
  repost_count?: number
}

const QUOTED_FIELDS = `
  id, caption, tag, tag2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
  author:profiles!posts_author_id_fkey ( id, username, avatar_url )
`

export async function attachPostMeta<T extends { id: string; post_kind?: string }>(
  supabase: any,
  posts: T[],
): Promise<(T & PostMeta)[]> {
  if (posts.length === 0) return posts

  const { data, error } = await supabase
    .from('posts')
    .select('id, grade_note, graded_by, odds_source, odds_book, money_public, repost_of, game_starts_at')
    .in('id', posts.map(p => p.id))

  if (error || !data) return posts

  const meta = new Map<string, PostMeta>(
    data.map((r: any) => [r.id, {
      grade_note: r.grade_note, graded_by: r.graded_by,
      odds_source: r.odds_source, odds_book: r.odds_book, money_public: r.money_public,
      repost_of: r.repost_of, game_starts_at: r.game_starts_at,
    }]),
  )

  // The posts being quoted, fetched in one go rather than per card.
  const targets = [...new Set(data.map((r: any) => r.repost_of).filter(Boolean))] as string[]
  const quoted = new Map<string, any>()
  if (targets.length > 0) {
    const { data: originals } = await supabase.from('posts').select(QUOTED_FIELDS).in('id', targets)
    for (const o of originals ?? []) quoted.set(o.id, o)
  }

  // How many times each of these has been passed along. Counted over the
  // originals, so a repost shows the original's total rather than zero.
  const countable = posts.map(p => meta.get(p.id)?.repost_of ?? p.id)
  const counts = new Map<string, number>()
  if (countable.length > 0) {
    const { data: rows } = await supabase
      .from('posts').select('repost_of').in('repost_of', [...new Set(countable)])
    for (const r of rows ?? []) {
      counts.set(r.repost_of, (counts.get(r.repost_of) ?? 0) + 1)
    }
  }

  return posts.map(p => {
    const m = meta.get(p.id) ?? {}
    const originalId = m.repost_of ?? p.id
    return {
      ...p, ...m,
      reposted: m.repost_of ? quoted.get(m.repost_of) ?? null : null,
      repost_count: counts.get(originalId) ?? 0,
    }
  })
}
