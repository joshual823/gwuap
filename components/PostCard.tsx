'use client'
import Link from 'next/link'
import {
  BET_TYPES, parseAmericanOdds, profitOnWin, profitForStatus,
  formatUsd, formatSignedUsd, type BetType, type PickStatus,
} from '@/lib/odds'
import { timeAgo } from '@/lib/time'
import { tallyReactions } from '@/lib/reactions'
import ReactionBar from './ReactionBar'

type Post = {
  id: string
  caption: string | null
  slip_image_url: string | null
  bet_type: BetType | null
  odds: string | null
  stake: number | null
  profit: number | null
  status: PickStatus
  tag: string | null
  sentiment: 'backing' | 'fading'
  created_at: string
  author: { id: string; username: string; avatar_url: string | null }
  category: { name: string } | null
  likes: { user_id: string; emoji: string | null }[]
  comment_count: number
  viewer_id: string | null
}

export default function PostCard({ post }: { post: Post }) {
  const betLabel = BET_TYPES.find(b => b.value === post.bet_type)?.label

  // Graded picks show what actually happened. Older picks graded before
  // Session 5 have no stored profit, so fall back to recomputing it.
  const settled = post.profit ?? profitForStatus(post.status, post.odds, post.stake)

  // Pending picks show what's on the line instead.
  const oddsValue = parseAmericanOdds(post.odds)
  const toWin = post.status === 'pending' && oddsValue !== null && post.stake != null
    ? profitOnWin(oddsValue, post.stake)
    : null

  const reactions = post.likes ?? []
  const counts = tallyReactions(reactions)
  const mine = reactions.find(l => l.user_id === post.viewer_id)?.emoji ?? null

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

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
          {post.tag && <span className="cashtag">{post.tag}</span>}
          {post.category && <span className="pill">{post.category.name}</span>}
          <span className={`sentiment ${post.sentiment}`}>{post.sentiment}</span>
        </div>

        {post.caption && <p className="post-text">{post.caption}</p>}

        {post.slip_image_url && (
          <img src={post.slip_image_url} alt="Bet slip" className="post-img" />
        )}

        <div className="stat-row">
          {betLabel && <span className="stat-key">{betLabel}</span>}
          {post.odds && <span className="stat-key">ODDS <span className="stat-val">{post.odds}</span></span>}
          {post.stake != null && <span className="stat-key">RISK <span className="stat-val">{formatUsd(post.stake)}</span></span>}
          {settled != null && (
            <span className={`amt ${settled >= 0 ? 'pos' : 'neg'}`}>{formatSignedUsd(settled)}</span>
          )}
          {toWin != null && (
            <span className="stat-key">TO WIN <span className="stat-val">{formatUsd(toWin)}</span></span>
          )}
        </div>

        <div className="action-row">
          <ReactionBar
            targetKind="post"
            targetId={post.id}
            initialCounts={counts}
            initialMine={mine}
            viewerId={post.viewer_id}
          />
          <Link href={`/post/${post.id}`} className="action-btn">
            <span style={{ fontSize: 15 }}>💬</span> {post.comment_count}
          </Link>
          <span className="action-btn">⟲</span>
        </div>
      </div>
    </article>
  )
}
