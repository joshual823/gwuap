import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import CommentForm from './CommentForm'
import DeleteComment from './DeleteComment'
import { timeAgo } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // A malformed id makes Postgres error rather than return null, which
  // maybeSingle() surfaces as data: null — so both cases land on notFound().
  const { data: rawPost } = await supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, sentiment, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey ( id, username, avatar_url ),
      category:categories ( name ),
      likes ( user_id ),
      comments ( id )
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!rawPost) notFound()

  const p = rawPost as any
  const post = {
    ...p,
    like_count: p.likes?.length ?? 0,
    comment_count: p.comments?.length ?? 0,
    liked_by_me: !!p.likes?.find((l: any) => l.user_id === user?.id),
  }

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, body, created_at,
      author:profiles!comments_author_id_fkey ( id, username, avatar_url )
    `)
    .eq('post_id', params.id)
    .order('created_at', { ascending: true })

  const list = (comments ?? []) as any[]

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/feed" className="back-link">← Back to feed</Link>

      <PostCard post={post} />

      <h2 className="comments-heading">
        {list.length === 0 ? 'No replies yet' : `${list.length} ${list.length === 1 ? 'reply' : 'replies'}`}
      </h2>

      {list.map(c => (
        <article className="comment" key={c.id}>
          <Link href={`/profile/${c.author?.username}`}>
            <div className="avatar comment-avatar" />
          </Link>
          <div className="comment-body">
            <div className="comment-head">
              <Link href={`/profile/${c.author?.username}`} className="uname">@{c.author?.username}</Link>
              <span className="dot">·</span>
              <span className="time">{timeAgo(c.created_at)}</span>
              {user?.id === c.author?.id && <DeleteComment commentId={c.id} />}
            </div>
            <p className="comment-text">{c.body}</p>
          </div>
        </article>
      ))}

      <CommentForm postId={post.id} signedIn={!!user} />
    </div>
  )
}
