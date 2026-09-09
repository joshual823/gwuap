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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mine = game && market ? sideFromMarket(game, market) : null
  const theirs = mine ? opposingSide(mine) : null

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!game || !market || !mine || !theirs) return
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
      line: mine.line, odds: market.odds, odds_source: 'book', odds_book: game.book ?? null,
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
      opponent_odds: market.odds, odds_book: game.book ?? null,
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
              onSelect={(g, m) => { setGame(g); setMarket(m) }}
              onSelectGame={g => { setGame(g); setMarket(null) }}
            />
          </>
        )}

        {mine && theirs && (
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

        <button className="btn" type="submit" disabled={saving || !mine} style={{ marginTop: 14 }}>
          {saving ? 'Creating…' : 'Create the challenge'}
        </button>
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
