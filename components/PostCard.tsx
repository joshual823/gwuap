'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

type Post = {
  id: string
  caption: string | null
  slip_image_url: string | null
  odds: string | null
  stake: number | null
  currency: string | null
  status: 'pending' | 'win' | 'loss' | 'push' | 'void'
  tag: string | null
  sentiment: 'backing' | 'fading'
  created_at: string
  author: { id: string; username: string; avatar_url: string | null }
  category: { name: string } | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function PostCard({ post }: { post: Post }) {
  const supabase = createClient()
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count)

  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: post.id })
      setLiked(false); setLikeCount(c => c - 1)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: post.id })
      setLiked(true); setLikeCount(c => c + 1)
    }
  }

  return (
    <article className="post">
      <Link href={`/profile/${post.author.username}`}>
        <div className="avatar" />
      </Link>
      <div className="post-body">
        <div className="post-head">
          <Link href={`/profile/${post.author.username}`} className="uname">@{post.author.username}</Link>
          <span className="dot">·</span>
          <span className="time">{timeAgo(post.created_at)}</span>
          {post.status !== 'pending' && <span className={`stamp ${post.status}`}>{post.status}</span>}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0' }}>
          {post.tag && <span className="cashtag">{post.tag}</span>}
          {post.category && <span className="pill">{post.category.name}</span>}
          <span className={`sentiment ${post.sentiment}`}>{post.sentiment}</span>
        </div>

        {post.caption && <p className="post-text">{post.caption}</p>}

        {post.slip_image_url && (
          <img src={post.slip_image_url} alt="Bet slip" className="post-img" />
        )}

        {(post.odds || post.stake != null) && (
          <div className="stat-row">
            {post.odds && <span style={{ color: 'var(--ink-dim)' }}>ODDS {post.odds}</span>}
            {post.stake != null && <span style={{ color: 'var(--ink-dim)' }}>STAKE {post.currency ?? '$'}{post.stake}</span>}
            <span className="unverified">Unverified</span>
          </div>
        )}

        <div className="action-row">
          <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={toggleLike} aria-pressed={liked}>
            <span style={{ fontSize: 16 }}>{liked ? '♥' : '♡'}</span> {likeCount}
          </button>
          <Link href={`/post/${post.id}`} className="action-btn">
            <span style={{ fontSize: 15 }}>💬</span> {post.comment_count}
          </Link>
          <span className="action-btn">⟲</span>
        </div>
      </div>
    </article>
  )
}
