import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import Avatar from '@/components/Avatar'

/**
 * Both sides of the follow graph render the same way; only the direction
 * of the join changes. "followers" reads the rows pointing at this
 * profile, "following" reads the rows pointing away from it.
 *
 * The lists are public, which matches the `follows are publicly readable`
 * policy the table already had — no new grant is involved.
 */
export default async function FollowList({ username, mode }: {
  username: string
  mode: 'followers' | 'following'
}) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Banned accounts stay out of both lists, the same way they're kept off
  // the leaderboard — otherwise a ban is invisible everywhere but the feed.
  const column = mode === 'followers' ? 'following_id' : 'follower_id'
  const join = mode === 'followers' ? 'follower' : 'following'
  const { data: rows } = await supabase
    .from('follows')
    .select(`
      created_at,
      follower:profiles!follows_follower_id_fkey ( id, username, display_name, avatar_url, is_banned ),
      following:profiles!follows_following_id_fkey ( id, username, display_name, avatar_url, is_banned )
    `)
    .eq(column, profile.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const people = (rows ?? [])
    .map((r: any) => r[join])
    .filter((p: any) => p && !p.is_banned)

  const title = mode === 'followers' ? 'Followers' : 'Following'
  const empty = mode === 'followers'
    ? `Nobody follows @${profile.username} yet.`
    : `@${profile.username} isn't following anyone yet.`

  return (
    <div style={{ marginTop: 16 }}>
      <Link href={`/profile/${profile.username}`} className="back-link">← @{profile.username}</Link>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 12px' }}>{title}</h1>

      {people.length === 0 && (
        <p style={{ color: 'var(--ink-dim)' }}>{empty}</p>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '2px 14px' }}>
        {people.map((p: any) => (
          <Link href={`/profile/${p.username}`} key={p.id} className="lb-row">
            <Avatar url={p.avatar_url} size={34} name={p.username} />
            <div className="lb-who">
              <span style={{ fontWeight: 600, fontSize: 14 }}>@{p.username}</span>
              {p.display_name && (
                <span className="lb-meta" style={{ color: 'var(--ink-dim)' }}>{p.display_name}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
