import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import CommentThread from './CommentThread'

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
      likes ( user_id, emoji ),
      comments ( id )
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!rawPost) notFound()

  const p = rawPost as any
  const post = {
    ...p,
    comment_count: p.comments?.length ?? 0,
    viewer_id: user?.id ?? null,
  }

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, body, created_at, parent_id,
      author:profiles!comments_author_id_fkey ( id, username, avatar_url ),
      comment_reactions ( user_id, emoji )
    `)
    .eq('post_id', params.id)
    .order('created_at', { ascending: true })

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/feed" className="back-link">← Back to feed</Link>

      <PostCard post={post} />

      <CommentThread
        postId={post.id}
        viewerId={user?.id ?? null}
        comments={(comments ?? []) as any}
      />
    </div>
  )
}
