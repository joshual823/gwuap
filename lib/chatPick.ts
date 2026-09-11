import type { BetType, Direction, PickStatus, PostKind } from '@/lib/odds'

/**
 * A pick as a room needs to show it.
 *
 * Deliberately narrower than the feed card: a message in a chat is one
 * line of a conversation, and a full PostCard — reactions, reposts,
 * comment count, share row — turns every shared pick into a second feed
 * running down the middle of the room. What a reader needs here is what
 * was bet, at what price, and how it turned out; the rest is one tap
 * away on the post itself.
 */
export type ChatPick = {
  id: string
  caption: string | null
  post_kind: PostKind
  bet_type: BetType | null
  odds: string | null
  line: number | null
  status: PickStatus
  tag: string | null
  sentiment: Direction
  late_entry?: boolean | null
}

/** The columns above, as a PostgREST select list. */
export const CHAT_PICK_COLUMNS =
  'id, caption, post_kind, bet_type, odds, line, status, tag, sentiment, late_entry'
