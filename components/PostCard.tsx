'use client'
import Link from 'next/link'
import {
  BET_TYPES, labelFor, parseAmericanOdds, profitOnWin, profitForStatus,
  formatUsd, formatSignedUsd, type BetType, type PickStatus, type PostKind, type Direction,
} from '@/lib/odds'
import { timeAgo } from '@/lib/time'
import { tallyReactions } from '@/lib/reactions'
import { tickerHref } from '@/lib/ticker'
import ReactionBar from './ReactionBar'
import PostMenu from './PostMenu'
import Avatar from './Avatar'
import RichText from './RichText'
import ShareButton from './ShareButton'
import { BLOCKED_LABELS, type Blocked } from '@/lib/grade'

type Post = {
  id: string
  caption: string | null
  slip_image_url: string | null
  post_kind: PostKind
  bet_type: BetType | null
  odds: string | null
  stake: number | null
  profit: number | null
  status: PickStatus
  /** Set only when auto-grading refused this pick and a person must decide. */
  grade_note?: string | null
  /** 'auto' from the final score, 'user' self-reported, 'admin' settled by hand. */
  graded_by?: string | null
  tag: string | null
  tag2: string | null
  sentiment: Direction
  created_at: string
  author: { id: string; username: string; avatar_url: string | null }
  category: { name: string } | null
  likes: { user_id: string; emoji: string | null }[]
  comment_count: number
  viewer_id: string | null
}

export default function PostCard({ post }: { post: Post }) {
  const betLabel = BET_TYPES.find(b => b.value === post.bet_type)?.label

  // What lands in a text message alongside the link. The tag and the
  // direction are the whole point of the post, so they lead.
  const shareSummary = [
    `@${post.author.username}`,
    post.tag,
    post.post_kind === 'pick' ? labelFor(post.sentiment) : 'take',
    post.odds,
  ].filter(Boolean).join(' · ')

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
        <Avatar url={post.author.avatar_url} />
      </Link>
      <div className="post-body">
        <div className="post-head">
          <Link href={`/profile/${post.author.username}`} className="uname">@{post.author.username}</Link>
          <span className="dot">·</span>
          <span className="time">{timeAgo(post.created_at)}</span>
          {post.post_kind === 'take' && <span className="stamp take">take</span>}
          {post.post_kind === 'pick' && post.status !== 'pending' &&
            <span className={`stamp ${post.status}`}>{post.status}</span>}
          {/* How it was settled, whenever that isn't the scoreboard.
              A self-graded record is a claim rather than a result, and a
              site that says it doesn't take self-reporting has to show
              which of its own numbers came from it. */}
          {post.post_kind === 'pick' && post.status !== 'pending' && post.graded_by === 'user' &&
            <span className="stamp self" title="Graded by the author before auto-grading existed">self-graded</span>}
          {post.post_kind === 'pick' && post.status !== 'pending' && post.graded_by === 'admin' &&
            <span className="stamp settled" title="Settled by an admin because the scoreboard couldn't">reviewed</span>}
          {/* Everyone sees that a pick is held rather than quietly not
              counting — with a prize on the board, an invisible hold is
              indistinguishable from a rigged one. */}
          {post.post_kind === 'pick' && post.status === 'pending' && post.grade_note &&
            <span className="stamp review">under review</span>}
          <PostMenu postId={post.id} authorId={post.author.id} viewerId={post.viewer_id} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
          {post.tag && <Link href={tickerHref(post.tag)} className="cashtag">{post.tag}</Link>}
          {post.tag2 && <><span className="vs">vs</span><Link href={tickerHref(post.tag2)} className="cashtag">{post.tag2}</Link></>}
          {post.category && <span className="pill">{post.category.name}</span>}
          <span className={`sentiment ${post.sentiment}`}>{labelFor(post.sentiment)}</span>
        </div>

        {post.caption && <RichText text={post.caption} className="post-text" />}

        {post.slip_image_url && (
          <img src={post.slip_image_url} alt="Bet slip" className="post-img" />
        )}

        {post.post_kind === 'pick' && (
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
        )}

        {/* The author gets the reason, not just the badge. Someone whose
            pick isn't counting during a contest should be able to see why
            without asking, and most of these are fixable facts rather
            than verdicts. */}
        {post.grade_note && post.viewer_id === post.author.id && (
          <p className="review-why">
            {BLOCKED_LABELS[post.grade_note as Blocked] ?? post.grade_note}. An
            admin will settle it — it isn&apos;t counting toward your record yet.
          </p>
        )}

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
          <ShareButton postId={post.id} summary={shareSummary} />
        </div>
      </div>
    </article>
  )
}
