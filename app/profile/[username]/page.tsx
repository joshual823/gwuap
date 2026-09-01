import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import ProfileActions from './ProfileActions'
import GradeButtons from './GradeButtons'
import LogoutButton from '@/components/LogoutButton'
import EditProfile from './EditProfile'
import { profitForStatus, formatSignedUsd } from '@/lib/odds'

export const dynamic = 'force-dynamic'

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const [{ count: followerCount }, { count: followingCount }, { data: myFollow }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    user
      ? supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const { data: rawPosts } = await supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, tag2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey ( id, username, avatar_url ),
      category:categories ( name ),
      likes ( user_id, emoji ),
      comments ( id )
    `)
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })

  const posts = (rawPosts ?? []).map((p: any) => ({
    ...p,
    comment_count: p.comments?.length ?? 0,
    viewer_id: user?.id ?? null,
  }))

  const picks = posts.filter((p: any) => p.post_kind === 'pick')
  const takeCount = posts.length - picks.length
  const wins = picks.filter((p: any) => p.status === 'win').length
  const losses = picks.filter((p: any) => p.status === 'loss').length
  const winPct = wins + losses > 0 ? Math.round((100 * wins) / (wins + losses)) : null

  // Lifetime $ result. Picks graded before Session 5 have no stored profit,
  // so recompute those from their odds and stake.
  const graded = picks.filter((p: any) => p.status !== 'pending')
  // A pick still pending a week later has almost certainly resolved.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const ungraded = picks.filter(
    (p: any) => p.status === 'pending' && new Date(p.created_at).getTime() < weekAgo,
  )
  const totalProfit = graded.reduce(
    (sum: number, p: any) => sum + (p.profit ?? profitForStatus(p.status, p.odds, p.stake) ?? 0),
    0,
  )

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="display" style={{ fontSize: 24, marginBottom: 2 }}>@{profile.username}</h1>
          {profile.bio && <p style={{ color: 'var(--ink-dim)', margin: '4px 0' }}>{profile.bio}</p>}
        </div>
        {user && user.id !== profile.id && (
          <ProfileActions profileId={profile.id} initiallyFollowing={!!myFollow} />
        )}
        {user?.id === profile.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <EditProfile profile={profile as any} />
            <LogoutButton />
          </div>
        )}
      </div>

      <div className="record mono" style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 14, flexWrap: 'wrap' }}>
        <span><strong>{wins}-{losses}</strong> record</span>
        {winPct !== null && <span>{winPct}% win rate</span>}
        {graded.length > 0 && (
          <span className={`amt ${totalProfit >= 0 ? 'pos' : 'neg'}`}>{formatSignedUsd(totalProfit)}</span>
        )}
        {ungraded.length > 0 && (
          <span style={{ color: 'var(--pending)' }}>{ungraded.length} ungraded</span>
        )}
        <span>{picks.length} picks</span>
        {takeCount > 0 && <span>{takeCount} takes</span>}
        <span>{followerCount ?? 0} followers</span>
        <span>{followingCount ?? 0} following</span>
      </div>

      {user?.id === profile.id && ungraded.length > 0 && (
        <div className="grade-nudge">
          <strong>{ungraded.length} pick{ungraded.length === 1 ? '' : 's'} still ungraded.</strong>
          <span>
            They're over a week old, so they've almost certainly settled. Ungraded
            picks are shown publicly and keep you off the leaderboard — grade the
            losses too or the record means nothing.
          </span>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 28, color: 'var(--ink-dim)' }}>Posts</h2>
      {posts.length === 0 && <p style={{ color: 'var(--ink-dim)' }}>Nothing posted yet.</p>}
      {posts.map((post: any) => (
        <div key={post.id}>
          <PostCard post={post} />
          {user?.id === profile.id && post.post_kind === 'pick' && post.status === 'pending' && (
            <GradeButtons postId={post.id} odds={post.odds} stake={post.stake} />
          )}
        </div>
      ))}
    </div>
  )
}
