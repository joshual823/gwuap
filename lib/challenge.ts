/**
 * Head-to-head: the two sides, and who won.
 *
 * A challenge is one market with both sides taken. The challenger picks
 * theirs; the opponent's is not a choice, it's whatever is left. Working
 * that out is the whole of the logic here, and it has to be exactly
 * right — an opponent handed the wrong side is being asked to bet
 * against something other than what they were shown.
 */

export type Market = 'moneyline' | 'spread' | 'total'

export type Side = {
  bet_type: Market
  /** The team the pick is on, as a cashtag. For a total, the away side. */
  tag: string
  /** The other team. */
  tag2: string
  sentiment: 'backing' | 'over' | 'under'
  /** The number the bet turns on. Null for a moneyline. */
  line: number | null
}

/** The markets a challenge can be made on, and what to call them. */
export const CHALLENGE_MARKETS: { value: Market; label: string; needsLine: boolean }[] = [
  { value: 'moneyline', label: 'Who wins', needsLine: false },
  { value: 'spread', label: 'The spread', needsLine: true },
  { value: 'total', label: 'Over / under', needsLine: true },
]

/**
 * The other half of the bet.
 *
 * Sides swap on a moneyline. On a spread the teams swap *and* the number
 * flips sign, because +3.5 for one of them is -3.5 for the other and
 * handing somebody "LAR -3.5" when the challenger took "SF -3.5" would
 * be two people betting the same way. On a total the teams stay put and
 * only the direction changes — a total is a bet on the game, not a team.
 */
export function opposingSide(side: Side): Side {
  switch (side.bet_type) {
    case 'moneyline':
      return { ...side, tag: side.tag2, tag2: side.tag, sentiment: 'backing', line: null }
    case 'spread':
      return {
        ...side,
        tag: side.tag2,
        tag2: side.tag,
        sentiment: 'backing',
        // `-0` is a real and distinct value in JavaScript, and a pick'em
        // is a real market, so negating a zero line would store one.
        // Postgres flattens it, but it survives long enough to fail an
        // equality check on the way there.
        line: side.line == null ? null : side.line === 0 ? 0 : -side.line,
      }
    case 'total':
      return { ...side, sentiment: side.sentiment === 'over' ? 'under' : 'over' }
  }
}

export type PickStatus = 'pending' | 'win' | 'loss' | 'push' | 'void'
export type Result = 'pending' | 'challenger' | 'opponent' | 'push' | 'void' | 'unsettled'

/**
 * Who won, read from the two picks rather than stored.
 *
 * Deriving it means the result can never disagree with the records it's
 * made of. It also means "pending" is a real answer rather than a stale
 * row: until both picks are graded, nobody has won.
 */
export function resultOf(challenger: PickStatus, opponent: PickStatus): Result {
  if (challenger === 'pending' || opponent === 'pending') return 'pending'
  if (challenger === 'win') return 'challenger'
  if (opponent === 'win') return 'opponent'
  if (challenger === 'push' && opponent === 'push') return 'push'
  if (challenger === 'void' || opponent === 'void') return 'void'
  // Both sides losing is not a thing two opposite picks can honestly do,
  // so say so rather than picking a winner.
  return 'unsettled'
}

/** How the result reads to each person. */
export function resultLabel(result: Result, youAreChallenger: boolean): string {
  switch (result) {
    case 'pending': return 'Not settled yet'
    case 'push': return 'Push — nobody won'
    case 'void': return 'Void — the game never settled it'
    case 'unsettled': return 'The scoreboard didn’t settle this one'
    case 'challenger': return youAreChallenger ? 'You won' : 'You lost'
    case 'opponent': return youAreChallenger ? 'You lost' : 'You won'
  }
}

/**
 * The code in the link.
 *
 * No l, 1, o or 0: this gets read aloud and retyped from a group chat,
 * and those four are where that goes wrong. Eight characters from the
 * remaining 32 is a keyspace far past anything worth guessing at, for a
 * row that reveals a fixture and two usernames.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

export function makeCode(random: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < 8; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)]
  return out
}
