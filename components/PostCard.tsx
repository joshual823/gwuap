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
import RepostButton from './RepostButton'
import { CommentIcon } from './icons'
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
  /** 'book' if the price came from a real posted market, 'custom' if typed. */
  odds_source?: string | null
  odds_book?: string | null
  money_public?: boolean | null
  /** The post being passed along, when this is a repost. */
  reposted?: any | null
  repost_count?: number
  game_starts_at?: string | null
  /** The number a bet turns on: 8.5 on a total, 4.5 on a first five. */
  line?: number | null
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
  // The chip wants a name, not a description: "First inning — run or no
  // run" is right in the form and far too long on a card.
  const betEntry = BET_TYPES.find(b => b.value === post.bet_type)
  const betLabel = betEntry?.short ?? betEntry?.label

  // Money on a hand-priced pick is the author's own note. Everyone else
  // sees the pick and its result; only the author sees the numbers,
  // unless they chose to publish them.
  const selfReported = post.post_kind === 'pick' && post.odds_source === 'custom'
  const isAuthor = post.viewer_id !== null && post.viewer_id === post.author.id
  const showMoney = !selfReported || post.money_public === true || isAuthor

  // A spread writes its number into the tag — "$SF -3.5" — so repeating
  // it would read twice. Everything else that turns on a number has it
  // only in this column, and had nowhere to show it.
  const showsLine = post.line != null && post.bet_type !== 'spread'

  // A pick stops being withdrawable at kick-off. The database enforces
  // this; the menu needs to know so it can say why rather than offering
  // a button that silently does nothing — a blocked delete comes back
  // from PostgREST as a success with no rows touched.
  const lockedForDelete =
    post.post_kind === 'pick' &&
    (post.status !== 'pending' ||
      (!!post.game_starts_at && new Date(post.game_starts_at) <= new Date()))

  // What lands in a text message alongside the link. The tag and the
  // direction are the whole point of the post, so they lead.
  const shareSummary = [
    `@${post.author.username}`,
    post.tag,
    post.post_kind === 'pick' ? labelFor(post.sentiment, post.bet_type) : 'take',
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
          {/* Where the price came from. Only the typed ones are marked:
              a real market is the default claim, and badging that too
              would imply the custom ones are equally normal. */}
          {/* Only worth saying when the numbers are actually on show —
              a hidden figure needs no disclaimer. */}
          {selfReported && showMoney && post.odds &&
            <span className="stamp custom"
              title="These numbers were entered by the author, not taken from a book">
              {post.money_public ? 'self-reported' : 'private'}
            </span>}
          {post.post_kind === 'pick' && post.odds_source === 'book' && post.odds_book &&
            <span className="stamp booked" title={`Price taken from ${post.odds_book}`}>{post.odds_book}</span>}
          {/* Everyone sees that a pick is held rather than quietly not
              counting — with a prize on the board, an invisible hold is
              indistinguishable from a rigged one. */}
          {post.post_kind === 'pick' && post.status === 'pending' && post.grade_note &&
            <span className="stamp review">under review</span>}
          <PostMenu postId={post.id} authorId={post.author.id} viewerId={post.viewer_id}
            locked={lockedForDelete} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
          {post.tag && <Link href={tickerHref(post.tag)} className="cashtag">{post.tag}</Link>}
          {post.tag2 && <><span className="vs">vs</span><Link href={tickerHref(post.tag2)} className="cashtag">{post.tag2}</Link></>}
          {post.category && <span className="pill">{post.category.name}</span>}
          <span className={`sentiment ${post.sentiment}`}>{labelFor(post.sentiment, post.bet_type)}</span>
        </div>

        {post.caption && <RichText text={post.caption} className="post-text" />}

        {/* The pick being passed along, shown whole. A repost that only
            said "@someone reposted this" would make the reader tap
            through to find out whether it's worth reading. */}
        {post.reposted && (
          <Link href={`/post/${post.reposted.id}`} className="quoted">
            <div className="quoted-head">
              <Avatar url={post.reposted.author?.avatar_url} size={20} />
              <span className="uname">@{post.reposted.author?.username}</span>
              <span className="dot">·</span>
              <span className="time">{timeAgo(post.reposted.created_at)}</span>
              {post.reposted.post_kind === 'pick' && post.reposted.status !== 'pending' && (
                <span className={`stamp ${post.reposted.status}`}>{post.reposted.status}</span>
              )}
            </div>
            {post.reposted.tag && (
              <div className="quoted-tags">
                <span className="cashtag">{post.reposted.tag}</span>
                {post.reposted.tag2 && <span className="vs">vs</span>}
                {post.reposted.tag2 && <span className="cashtag">{post.reposted.tag2}</span>}
                {post.reposted.post_kind === 'pick' && (
                  <span className={`sentiment ${post.reposted.sentiment}`}>
                    {labelFor(post.reposted.sentiment as Direction, post.reposted.bet_type)}
                    {post.reposted.line != null && post.reposted.bet_type !== 'spread'
                      ? ` ${post.reposted.line}` : ''}
                  </span>
                )}
              </div>
            )}
            {post.reposted.caption && <p className="quoted-text">{post.reposted.caption}</p>}
            {post.reposted.odds && (
              <p className="quoted-line">
                {post.reposted.odds}
                {post.reposted.stake != null && ` · $${post.reposted.stake}`}
              </p>
            )}
          </Link>
        )}

        {post.slip_image_url && (
          <img src={post.slip_image_url} alt="Slip" className="post-img" />
        )}

        {/* Always for a pick. What kind of bet it is and the number it
            turns on are the bet itself, not money — hiding them with the
            money left "Under" on a card with nothing to say under what. */}
        {post.post_kind === 'pick' && (
        <div className="stat-row">
          {betLabel && <span className="stat-key">{betLabel}</span>}
          {showsLine && (
            <span className="stat-key">LINE <span className="stat-val">{post.line}</span></span>
          )}
          {showMoney && post.odds &&
            <span className="stat-key">ODDS <span className="stat-val">{post.odds}</span></span>}
          {showMoney && post.stake != null &&
            <span className="stat-key">AMOUNT <span className="stat-val">{formatUsd(post.stake)}</span></span>}
          {showMoney && settled != null && (
            <span className={`amt ${settled >= 0 ? 'pos' : 'neg'}`}>{formatSignedUsd(settled)}</span>
          )}
          {showMoney && toWin != null && (
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
            <CommentIcon />{post.comment_count > 0 ? <span>{post.comment_count}</span> : null}
          </Link>
          {/* A repost of a repost points at the original, so chains stay
              one level deep and the card always shows the real pick. */}
          <RepostButton
            targetId={post.reposted?.id ?? post.id}
            viewerId={post.viewer_id}
            count={post.repost_count ?? 0}
          />
          <ShareButton postId={post.id} summary={shareSummary} />
        </div>
      </div>
    </article>
  )
}
