'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import GamePicker, { type Slim } from '@/components/GamePicker'
import { LEAGUES_WITH_SCORES } from '@/lib/scores'
import type { Market } from '@/lib/scores'
import { opposingSide, makeCode, type Side, type Market as ChallengeMarket } from '@/lib/challenge'

type Category = { id: number; name: string }

/** A market from the game feed, as the two sides of a challenge. */
function sideFromMarket(game: Slim, m: Market): Side | null {
  const away = `$${game.away.code}`, home = `$${game.home.code}`
  if (m.kind === 'total') {
    return {
      bet_type: 'total', tag: away, tag2: home,
      sentiment: m.side === 'over' ? 'over' : 'under', line: m.line,
    }
  }
  if (!m.code) return null
  const mine = `$${m.code}`
  const other = mine === away ? home : away
  return {
    bet_type: m.kind as ChallengeMarket,
    tag: mine, tag2: other, sentiment: 'backing',
    line: m.kind === 'spread' ? m.line : null,
  }
}

const describe = (s: Side) =>
  s.bet_type === 'total'
    ? `${s.sentiment === 'over' ? 'Over' : 'Under'} ${s.line}`
    : `${s.tag}${s.line != null ? ` ${s.line > 0 ? '+' : ''}${s.line}` : ''}`

export default function NewChallengeForm({ userId, categories }: {
  userId: string
  categories: Category[]
}) {
  const router = useRouter()
  const [league, setLeague] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [game, setGame] = useState<Slim | null>(null)
  const [market, setMarket] = useState<Market | null>(null)
  // Which team, when the game has no posted prices to pick a side from.
  const [team, setTeam] = useState<'away' | 'home' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * A side, from a posted price if there is one and from the two teams
   * if there isn't.
   *
   * Requiring a price was wrong, and silently so: plenty of fixtures
   * carry no market, the form offered them anyway, and choosing one left
   * the button disabled with nothing said. A head-to-head on who wins
   * needs two teams and nothing else — the score settles it whether or
   * not a book ever put a number on it.
   */
  const mine: Side | null =
    game && market ? sideFromMarket(game, market)
    : game && team ? {
        bet_type: 'moneyline',
        tag: `$${game[team].code}`,
        tag2: `$${game[team === 'away' ? 'home' : 'away'].code}`,
        sentiment: 'backing',
        line: null,
      }
    : null
  const theirs = mine ? opposingSide(mine) : null

  // Picks have to be in before the start, so a challenge on a game
  // already under way can never be graded. Said here rather than
  // discovered later by two people waiting for a result.
  const started = game?.startsAt ? Date.parse(game.startsAt) <= Date.now() : false

  function chooseGame(g: Slim, m: Market | null) {
    setGame(g); setMarket(m); setTeam(null); setError(null)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!game || !mine || !theirs) return
    if (started) { setError('That game has already started.'); return }
    const categoryId = categories.find(c => c.name === game.league)?.id
    if (categoryId === undefined) {
      setError(`No category for ${game.league} — that's a bug worth reporting.`)
      return
    }
    setSaving(true); setError(null)
    const supabase = createClient()

    // My side is posted as an ordinary pick, so it grades like every
    // other pick and counts toward my record whether or not anybody
    // ever takes the other side.
    const { data: post, error: postError } = await supabase.from('posts').insert({
      author_id: userId, category_id: categoryId, post_kind: 'pick',
      tag: mine.tag, tag2: mine.tag2, sentiment: mine.sentiment, bet_type: mine.bet_type,
      line: mine.line,
      // Only claim a book price when there was one. A challenge built
      // from two team names has no price and shouldn't pretend to.
      odds: market?.odds ?? null,
      odds_source: market ? 'book' : null,
      odds_book: market ? game.book ?? null : null,
      money_public: true, game_id: game.id, game_league: game.league,
      game_starts_at: game.startsAt,
      caption: `Head to head: I've got ${describe(mine)}. Who wants the other side?`,
    }).select('id').single()

    if (postError || !post) { setSaving(false); setError(postError?.message ?? 'Could not post that pick.'); return }

    const { data: ch, error: chError } = await supabase.from('challenges').insert({
      code: makeCode(),
      challenger_id: userId, challenger_post_id: post.id,
      game_id: game.id, game_league: game.league, game_starts_at: game.startsAt,
      bet_type: theirs.bet_type, line: theirs.line,
      opponent_tag: theirs.tag, opponent_tag2: theirs.tag2,
      opponent_sentiment: theirs.sentiment,
      opponent_odds: market?.odds ?? null, odds_book: market ? game.book ?? null : null,
      category_id: categoryId,
    }).select('code').single()

    setSaving(false)
    if (chError || !ch) { setError(chError?.message ?? 'Could not create the challenge.'); return }
    router.push(`/c/${ch.code}`)
    router.refresh()
  }

  return (
    <div className="legal">
      <p className="rec-back"><Link href="/challenges" className="help-link">← Challenges</Link></p>
      <h1 className="page-title">Challenge someone</h1>
      <p className="legal-sub">
        Take a side. You get a link — whoever opens it takes the other side, and
        the final score settles it. Neither of you grades anything.
      </p>

      <form onSubmit={create}>
        <label className="form-label">League</label>
        <select className="field" value={league ?? ''} required
          onChange={e => { setLeague(e.target.value || null); setGame(null); setMarket(null) }}>
          <option value="">Choose a league</option>
          {LEAGUES_WITH_SCORES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {league && (
          <>
            <label className="form-label">Game</label>
            <input className="field" value={query} placeholder="Type a team…"
              onChange={e => setQuery(e.target.value)} />
            <GamePicker
              league={league}
              query={query}
              selectedGameId={game?.id ?? null}
              onSelect={(g, m) => chooseGame(g, m)}
              onSelectGame={g => chooseGame(g, null)}
            />
          </>
        )}

        {/* No posted price, so the side is chosen by naming a team. */}
        {game && !market && !started && (
          <>
            <label className="form-label">Which side are you taking?</label>
            <p className="rec-note">
              No posted prices on this one, so this is a straight head-to-head on
              who wins. It still grades itself from the final score.
            </p>
            <div className="ch-teams">
              {(['away', 'home'] as const).map(which => (
                <button key={which} type="button"
                  className={`ch-team ${team === which ? 'active' : ''}`}
                  onClick={() => setTeam(which)}>
                  {game[which].label || game[which].code}
                  <span className="ch-team-sub">{which === 'away' ? 'away' : 'home'}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {started && (
          <p className="form-warn">
            This game has already started, so a pick on it can&apos;t be graded —
            and a challenge nobody can win isn&apos;t worth sending. Pick one that
            hasn&apos;t kicked off.
          </p>
        )}

        {mine && theirs && !started && (
          <div className="ch-preview">
            <div className="ch-side">
              <span className="ch-who">You take</span>
              <span className="ch-pick">{describe(mine)}</span>
            </div>
            <span className="ch-vs">vs</span>
            <div className="ch-side">
              <span className="ch-who">They take</span>
              <span className="ch-pick">{describe(theirs)}</span>
            </div>
          </div>
        )}

        <button className="btn" type="submit" disabled={saving || !mine || started}
          style={{ marginTop: 14 }}>
          {saving ? 'Creating…' : 'Create the challenge'}
        </button>
        {/* Why the button won't move, rather than a button that does
            nothing when pressed. */}
        {!mine && !started && (
          <p className="rec-note" style={{ marginTop: 8 }}>
            {!league ? 'Choose a league to start.'
              : !game ? 'Pick the game you want to take a side on.'
              : 'Choose which side you’re taking.'}
          </p>
        )}
        {error && <p style={{ color: 'var(--bear)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>

      <p className="rec-foot">
        Your side posts straight away as a normal pick, so it counts toward your
        record whether or not anyone takes it. Picks have to be in before the
        game starts, so a challenge on a game already under way can&apos;t be
        graded and won&apos;t be offered.
      </p>
    </div>
  )
}
