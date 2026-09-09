import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import Avatar from '@/components/Avatar'
import AcceptChallenge from './AcceptChallenge'
import { resultOf, resultLabel, type PickStatus } from '@/lib/challenge'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

const describe = (tag: string, sentiment: string, line: number | null, betType: string) =>
  betType === 'total'
    ? `${sentiment === 'over' ? 'Over' : 'Under'} ${line}`
    : `${tag}${line != null ? ` ${line > 0 ? '+' : ''}${line}` : ''}`

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return {
    title: `A challenge on ${SITE_NAME}`,
    description: `Someone took a side and left the other one open. Code ${code}.`,
  }
}

/**
 * The page a link lands on — and the only one built for somebody who has
 * never been here. It has to make sense before signing up, which is why
 * the row is readable without an account.
 */
export default async function ChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  const { data: ch } = await supabase
    .from('challenges')
    .select(`
      id, code, bet_type, line, opponent_tag, opponent_tag2, opponent_sentiment,
      opponent_odds, odds_book, game_id, game_league, game_starts_at, category_id,
      challenger_id, challenger_post_id, opponent_id, opponent_post_id, accepted_at,
      challenger:profiles!challenges_challenger_id_fkey ( username, avatar_url ),
      opponent:profiles!challenges_opponent_id_fkey ( username, avatar_url )
    `)
    .eq('code', code.toLowerCase())
    .maybeSingle()
  if (!ch) notFound()

  const c = ch as any
  const { data: { user } } = await supabase.auth.getUser()

  // Both sides as they stand. The challenger's pick is the mirror of the
  // one on offer, so it's read rather than re-derived.
  const { data: posts } = await supabase
    .from('posts')
    .select('id, tag, tag2, sentiment, bet_type, line, status')
    .in('id', [c.challenger_post_id, c.opponent_post_id].filter(Boolean))
  const byId = new Map((posts ?? []).map((p: any) => [p.id, p]))
  const mine = byId.get(c.challenger_post_id)
  const theirs = c.opponent_post_id ? byId.get(c.opponent_post_id) : null

  const taken = !!c.opponent_id
  const isChallenger = user?.id === c.challenger_id
  const isOpponent = user?.id === c.opponent_id
  const started = c.game_starts_at ? Date.parse(c.game_starts_at) <= Date.now() : false

  const result = taken && mine && theirs
    ? resultOf(mine.status as PickStatus, theirs.status as PickStatus)
    : 'pending'

  const offer = describe(c.opponent_tag, c.opponent_sentiment, c.line, c.bet_type)
  const challengerPick = mine
    ? describe(mine.tag, mine.sentiment, mine.line, mine.bet_type)
    : '—'

  return (
    <div className="legal">
      <h1 className="page-title">Head to head</h1>
      <p className="legal-sub">
        {c.game_league} · settled by the final score. Neither side grades anything,
        and nothing can be changed once the game starts.
      </p>

      <div className="ch-board">
        <div className="ch-board-side">
          <Avatar url={c.challenger?.avatar_url} size={38} name={c.challenger?.username} />
          <span className="ch-board-name">@{c.challenger?.username}</span>
          <span className="ch-board-pick">{challengerPick}</span>
          {mine && mine.status !== 'pending' && (
            <span className={`stamp ${mine.status}`}>{mine.status}</span>
          )}
        </div>
        <span className="ch-board-vs">vs</span>
        <div className="ch-board-side">
          {taken ? (
            <>
              <Avatar url={c.opponent?.avatar_url} size={38} name={c.opponent?.username} />
              <span className="ch-board-name">@{c.opponent?.username}</span>
            </>
          ) : (
            <>
              <span className="ch-board-open">?</span>
              <span className="ch-board-name">Open</span>
            </>
          )}
          <span className="ch-board-pick">{offer}</span>
          {theirs && theirs.status !== 'pending' && (
            <span className={`stamp ${theirs.status}`}>{theirs.status}</span>
          )}
        </div>
      </div>

      {taken ? (
        <p className="ch-result">
          {result === 'pending'
            ? 'Both sides are in. The scoreboard settles it.'
            : (isChallenger || isOpponent)
              ? resultLabel(result, isChallenger)
              : result === 'challenger' ? `@${c.challenger?.username} won`
              : result === 'opponent' ? `@${c.opponent?.username} won`
              : resultLabel(result, true)}
        </p>
      ) : started ? (
        <p className="ch-result">
          This one wasn&apos;t taken before the game started, so it can&apos;t be
          graded. Picks have to be in beforehand — that&apos;s the rule that makes
          the records mean anything.
        </p>
      ) : (
        <AcceptChallenge
          challengeId={c.id}
          viewerId={user?.id ?? null}
          isChallenger={isChallenger}
          code={c.code}
          side={{
            tag: c.opponent_tag, tag2: c.opponent_tag2, sentiment: c.opponent_sentiment,
            bet_type: c.bet_type, line: c.line, odds: c.opponent_odds,
            odds_book: c.odds_book, category_id: c.category_id,
            game_id: c.game_id, game_league: c.game_league, game_starts_at: c.game_starts_at,
          }}
          offer={offer}
          challenger={c.challenger?.username ?? 'someone'}
        />
      )}

      <p className="rec-foot">
        Both sides post as ordinary picks and are graded by the same job that
        grades everything else on {SITE_NAME} — from the final score, hourly,
        and never by the person who made them.{' '}
        <Link href="/help" className="help-link">How it works</Link>
      </p>
    </div>
  )
}
