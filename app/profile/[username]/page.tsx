import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import { attachPostMeta } from '@/lib/postMeta'
import ProfileActions from './ProfileActions'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import EditProfile from './EditProfile'
import Avatar from '@/components/Avatar'
import MessageButton from './MessageButton'
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

  // Read separately rather than as part of the select above. Folding a new
  // column into that query means the whole thing fails until the migration
  // runs, and since it gates notFound(), every profile on the site would
  // 404. An error here just leaves the picker empty.
  const { data: prefRow } = await supabase
    .from('profiles').select('preferred_leagues').eq('id', profile.id).maybeSingle()
  const preferredLeagues = (prefRow?.preferred_leagues as string[] | null) ?? null

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
  // The public figure counts only prices a book posted, matching the
  // leaderboard. A self-reported total is the author's own record and is
  // shown only to them.
  const totalProfit = graded.reduce(
    (sum: number, p: any) => sum + (p.profit ?? profitForStatus(p.status, p.odds, p.stake) ?? 0),
    0,
  )


  // Why a pending pick isn't graded, and how the settled ones were settled.
  const withNotes = await attachPostMeta(supabase, posts)

  // Records from before auto-grading are self-reported. Saying so on the
  // profile matters more than saying it on each post: the header is the
  // number that gets screenshotted, and "100% win rate" with no
  // provenance is exactly the claim this site says it doesn't accept.
  const selfGraded = withNotes.filter(
    (p: any) => p.post_kind === 'pick' && p.status !== 'pending' && p.graded_by === 'user',
  ).length

  // Two different numbers. The public one counts only prices a book
  // posted, which is what the leaderboard ranks and what a stranger is
  // entitled to believe. The other is the author's own bookkeeping, and
  // only they see it.
  const settledPicks = withNotes.filter(
    (p: any) => p.post_kind === 'pick' && p.status !== 'pending',
  )
  const moneyOf = (p: any) => p.profit ?? profitForStatus(p.status, p.odds, p.stake) ?? 0
  const bookProfit = settledPicks
    .filter((p: any) => p.odds_source === 'book')
    .reduce((sum: number, p: any) => sum + moneyOf(p), 0)
  const selfProfit = settledPicks
    .filter((p: any) => p.odds_source === 'custom' && (p.odds != null || p.stake != null))
    .reduce((sum: number, p: any) => sum + moneyOf(p), 0)
  const isOwnProfile = user?.id === profile.id

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar url={profile.avatar_url} size={48} />
            <h1 className="display" style={{ fontSize: 24, margin: 0 }}>@{profile.username}</h1>
          </div>
          {profile.display_name && (
            <p style={{ color: 'var(--ink-dim)', margin: '6px 0 0', fontSize: 14 }}>{profile.display_name}</p>
          )}
          {profile.bio && <p style={{ color: 'var(--ink-dim)', margin: '4px 0' }}>{profile.bio}</p>}
        </div>
        {user && user.id !== profile.id && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <ProfileActions profileId={profile.id} initiallyFollowing={!!myFollow} />
            <MessageButton profileId={profile.id} username={profile.username} />
          </div>
        )}
        {user?.id === profile.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <EditProfile profile={{ ...(profile as any), preferred_leagues: preferredLeagues }} />
            <ThemeToggle />
            <LogoutButton />
          </div>
        )}
      </div>

      {/* The record is what someone came here to judge, so the three
          numbers that constitute it get their own block each, with the
          label under the figure rather than beside it. Everything else
          is a count, and counts belong on one quiet line. */}
      <div className="stat-strip">
        <div className="stat-block">
          <span className="stat-figure">{wins}-{losses}</span>
          <span className="stat-label">Record</span>
        </div>
        {winPct !== null && (
          <div className="stat-block">
            <span className="stat-figure">{winPct}%</span>
            <span className="stat-label">Win rate</span>
          </div>
        )}
        {settledPicks.some((p: any) => p.odds_source === 'book') && (
          <div className="stat-block">
            <span className={`stat-figure ${bookProfit >= 0 ? 'pos' : 'neg'}`}>
              {formatSignedUsd(bookProfit)}
            </span>
            <span className="stat-label">Profit</span>
          </div>
        )}
        {isOwnProfile && selfProfit !== 0 && (
          <div className="stat-block">
            <span className={`stat-figure ${selfProfit >= 0 ? 'pos' : 'neg'}`}
              style={{ opacity: 0.75 }}>
              {formatSignedUsd(selfProfit)}
            </span>
            <span className="stat-label">Your own · private</span>
          </div>
        )}
      </div>

      <div className="stat-counts">
        <span>{picks.length} {picks.length === 1 ? 'pick' : 'picks'}</span>
        {takeCount > 0 && <span>{takeCount} {takeCount === 1 ? 'take' : 'takes'}</span>}
        <Link href={`/profile/${profile.username}/followers`} className="record-link">
          <strong>{followerCount ?? 0}</strong> {followerCount === 1 ? 'follower' : 'followers'}
        </Link>
        <Link href={`/profile/${profile.username}/following`} className="record-link">
          <strong>{followingCount ?? 0}</strong> following
        </Link>
        {selfGraded > 0 && <span className="stat-caveat">{selfGraded} self-graded</span>}
        {ungraded.length > 0 && <span className="stat-open">{ungraded.length} still open</span>}
      </div>

      {user?.id === profile.id && ungraded.length > 0 && (
        <div className="grade-nudge">
          <strong>{ungraded.length} pick{ungraded.length === 1 ? '' : 's'} still open.</strong>
          <span>
            Picks made on a game settle themselves once it finishes. These are
            either still waiting on a result, or aren't tied to a fixture —
            props, parlays and futures can't be settled from a scoreline, so
            they stay open and don't count toward your record.
          </span>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 28, color: 'var(--ink-dim)' }}>Posts</h2>
      {posts.length === 0 && <p style={{ color: 'var(--ink-dim)' }}>Nothing posted yet.</p>}
      {withNotes.map((post: any) => (
        <div key={post.id}>
          <PostCard post={post} />
        </div>
      ))}
    </div>
  )
}
