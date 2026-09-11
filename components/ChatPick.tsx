import Link from 'next/link'
import { BET_TYPES, labelFor } from '@/lib/odds'
import { tickerHref } from '@/lib/ticker'
import type { ChatPick as Pick } from '@/lib/chatPick'

/**
 * A pick shared into a chat room.
 *
 * One line of a conversation, not a second feed: the cashtag, what was
 * bet, the price, and where it stands. Everything else — reactions,
 * reposts, the comment thread — lives on the post, one tap away.
 */
export default function ChatPick({ pick }: { pick: Pick }) {
  const betEntry = BET_TYPES.find(b => b.value === pick.bet_type)
  const betLabel = betEntry?.short ?? betEntry?.label
  const side = labelFor(pick.sentiment, pick.bet_type)

  return (
    <div className="chat-pick">
      <div className="chat-pick-top">
        {pick.tag && (
          <Link href={tickerHref(pick.tag)} className="chat-pick-tag">{pick.tag}</Link>
        )}
        <span className="chat-pick-side">{side}</span>
        {pick.line != null && <span className="chat-pick-line mono">{pick.line}</span>}
        {betLabel && <span className="chat-pick-bet">{betLabel}</span>}
        {pick.odds && <span className="chat-pick-odds mono">{pick.odds}</span>}
        {pick.post_kind === 'pick' && pick.status !== 'pending' && (
          <span className={`stamp ${pick.status}`}>{pick.status}</span>
        )}
        {pick.post_kind === 'take' && <span className="stamp take">take</span>}
      </div>
      {pick.caption && <p className="chat-pick-say">{pick.caption}</p>}
      {/* The whole card would be a nicer target, but the cashtag inside
          it is already a link and nesting one inside another is not a
          thing HTML will do. */}
      <Link href={`/post/${pick.id}`} className="chat-pick-open">
        Open pick →
      </Link>
    </div>
  )
}
