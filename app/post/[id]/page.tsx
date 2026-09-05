import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import PostCard from '@/components/PostCard'
import { attachPostMeta } from '@/lib/postMeta'
import CommentThread from './CommentThread'
import { SITE_NAME } from '@/lib/brand'
import { labelFor, type Direction } from '@/lib/odds'

export const dynamic = 'force-dynamic'

/**
 * A shared pick should read as the pick in the preview, not as the site.
 * Next picks up opengraph-image.tsx in this folder on its own; this is
 * the words that sit next to it.
 */
export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('tag, tag2, sentiment, post_kind, bet_type, line, odds, stake, status, caption, author:profiles!posts_author_id_fkey ( username )')
    .eq('id', id)
    .maybeSingle()

  const p = data as any
  if (!p) return { title: `Pick — ${SITE_NAME}` }

  const who = p.author?.username ? `@${p.author.username}` : 'Someone'
  const what = [p.tag, p.tag2 && `vs ${p.tag2}`].filter(Boolean).join(' ')
  const title = `${who}: ${what}`.trim()
  const description = p.caption?.trim()
    || [
      p.post_kind === 'pick'
        ? labelFor(p.sentiment as Direction, p.bet_type) +
          (p.line != null && p.bet_type !== 'spread' ? ` ${p.line}` : '')
        : 'Take',
      p.odds, p.stake != null ? `$${p.stake}` : null,
      p.status !== 'pending' ? p.status.toUpperCase() : null,
    ].filter(Boolean).join(' · ')

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // A malformed id makes Postgres error rather than return null, which
  // maybeSingle() surfaces as data: null — so both cases land on notFound().
  const { data: rawPost } = await supabase
    .from('posts')
    .select(`
      id, caption, slip_image_url, tag, tag2, sentiment, post_kind, bet_type, odds, stake, profit, status, created_at,
      author:profiles!posts_author_id_fkey ( id, username, avatar_url, is_bot ),
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


  const withNotes = await attachPostMeta(supabase, [post])

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/feed" className="back-link">← Back to feed</Link>

      <PostCard post={withNotes[0] ?? post} />

      <CommentThread
        postId={post.id}
        viewerId={user?.id ?? null}
        comments={(comments ?? []) as any}
      />
    </div>
  )
}
