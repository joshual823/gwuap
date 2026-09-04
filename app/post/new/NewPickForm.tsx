'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import CashtagInput from '@/components/CashtagInput'
import GamePicker from '@/components/GamePicker'
import MentionInput from '@/components/MentionInput'
import {
  BET_TYPES, STAKE_PRESETS, MAX_STAKE,
  parseAmericanOdds, profitOnWin, payoutOnWin, formatUsd,
  directionsFor, wantsMatchup, isPropBet, QUICK_ODDS,
  type BetType, type PostKind, type Direction,
  isPeriodBet, periodBetsFor, splitAmericanOdds, formatAmericanOdds,
} from '@/lib/odds'

export default function NewPickForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [kind, setKind] = useState<PostKind>('take')
  const [betType, setBetType] = useState<BetType>('moneyline')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [tag, setTag] = useState('')
  const [tag2, setTag2] = useState('')
  // Starts unset on purpose. Direction drives Trending and the ticker, so
  // a silent default would make everything read as "backing".
  const [sentiment, setSentiment] = useState<Direction | null>(null)
  const [caption, setCaption] = useState('')

  // Odds and stake follow the same shape: quick chips, with a Custom chip
  // that reveals the typed input.
  const [oddsSign, setOddsSign] = useState<'+' | '-'>('-')
  const [oddsInput, setOddsInput] = useState('110')
  const [oddsCustom, setOddsCustom] = useState(false)

  const [presetStake, setPresetStake] = useState<number>(50)
  const [stakeCustom, setStakeCustom] = useState(false)
  const [customStake, setCustomStake] = useState('')

  const oddsScrollRef = useRef<HTMLDivElement>(null)
  const stakeScrollRef = useRef<HTMLDivElement>(null)
  const didScrollRef = useRef(false)

  // Which fixture this pick settles against, and the number it turns on.
  // Both arrive from a game card; a pick typed freehand has neither and
  // simply never gets auto-graded.
  const [gameId, setGameId] = useState<string | null>(null)
  const [gameLeague, setGameLeague] = useState<string | null>(null)
  const [gameStartsAt, setGameStartsAt] = useState<string | null>(null)
  const [line, setLine] = useState('')
  // Set when the pick came from tapping a real posted market. Editing the
  // odds clears it: the moment the number stops being the book's, saying
  // it came from the book would be false.
  const [book, setBook] = useState<string | null>(null)
  // The price the book was showing when the market was tapped. Kept
  // rather than a "has been edited" flag, because that flag was one-way:
  // change +100 to +200 and back to +100 and the pick stayed custom
  // forever, which is wrong — the number is the book's again.
  const [bookOdds, setBookOdds] = useState<string | null>(null)
  const [showMoney, setShowMoney] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('categories').select('id, name').then(({ data }) => {
      const rows = data ?? []
      setCategories(rows)
      // Arriving from a news headline: preselect its league.
      const wanted = searchParams.get('league')
      if (wanted) {
        const match = rows.find(c => c.name === wanted)
        if (match) { setCategoryId(match.id); return }
      }
      try {
        const last = Number(localStorage.getItem('gwuap:lastLeague'))
        if (rows.some(c => c.id === last)) setCategoryId(last)
      } catch { /* private mode, or storage blocked */ }
    })
    const headline = searchParams.get('headline')
    if (headline) setCaption(headline)
    // Arriving from a cashtag page: start with that ticker filled in.
    const presetTag = searchParams.get('tag')
    if (presetTag) setTag(presetTag.toUpperCase() + ' ')
    // Arriving from a game card: the opponent comes with it, and a
    // matchup means the bet is on the game, so default to a total.
    const presetTag2 = searchParams.get('tag2')
    if (presetTag2) { setTag2(presetTag2.toUpperCase()); setKind('pick') }
    // A game card knows what kind of bet its line represents.
    const presetBet = searchParams.get('bet')
    if (presetBet && BET_TYPES.some(b => b.value === presetBet)) {
      setKind('pick'); setBetType(presetBet as BetType)
    }
    // The fixture, so the pick can be settled against its final score.
    const presetGame = searchParams.get('game')
    const presetLeague = searchParams.get('league')
    if (presetGame && presetLeague) {
      setGameId(presetGame)
      setGameLeague(presetLeague)
      setGameStartsAt(searchParams.get('starts'))
      setKind('pick')
    }
    // A spread carries its own number; a total carries the game's.
    const presetLine = searchParams.get('line') ?? searchParams.get('total')
    if (presetLine && Number.isFinite(Number(presetLine))) setLine(presetLine)

    // Arrived by tapping a real market: the direction comes with it, and
    // the price is the book's until the author changes it.
    if (searchParams.get('src') === 'book') {
      // Normalised, so it compares equal to what the form will hold.
      setBookOdds(formatAmericanOdds(searchParams.get('odds')))
      setBook(searchParams.get('book'))
      setKind('pick')
    }
    const presetDir = searchParams.get('dir')
    if (presetDir && ['backing', 'fading', 'over', 'under'].includes(presetDir)) {
      setSentiment(presetDir as Direction)
    }
    const preset = splitAmericanOdds(searchParams.get('odds'))
    if (preset) {
      setKind('pick')
      setOddsSign(preset.sign)
      setOddsInput(preset.digits)
      if (!QUICK_ODDS.includes(`${preset.sign}${preset.digits}`)) setOddsCustom(true)
    }
    try {
      const lastStake = Number(localStorage.getItem('gwuap:lastStake'))
      if (Number.isFinite(lastStake) && lastStake > 0) {
        if (STAKE_PRESETS.includes(lastStake)) setPresetStake(lastStake)
        else { setStakeCustom(true); setCustomStake(String(lastStake)) }
      }
    } catch { /* ditto */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The three-way options read as team names rather than "backing" and
  // "fading", which mean nothing when the question is who's ahead at the
  // break. Falls back to generic wording until both tags are in.
  const directions = directionsFor(kind, betType, { primary: tag, secondary: tag2 })
  const showMatchup = wantsMatchup(kind, betType)

  const showPropHint = isPropBet(kind, betType)
  const leagueName = categories.find(c => c.id === categoryId)?.name ?? null

  // Part-of-game bets only appear where they can actually be settled:
  // innings for baseball, halves for the sports that have them. Offering
  // a first-half bet on hockey would create picks that can never grade.
  const availableBetTypes = useMemo(() => {
    const allowed = new Set<BetType>(periodBetsFor(leagueName ?? ''))
    return BET_TYPES.filter(b => !isPeriodBet(b.value) || allowed.has(b.value))
  }, [leagueName])

  // Changing the league away from the game's means the pick is no longer
  // about that fixture. Keeping the id would settle it against a game the
  // author never bet on, so it's dropped instead.
  useEffect(() => {
    if (gameId && leagueName && gameLeague && leagueName !== gameLeague) {
      setGameId(null)
      setGameLeague(null)
      setGameStartsAt(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueName])

  // Only two bet types turn on a number, and only those are auto-graded.
  // A number is only needed where the bet turns on one. Who-leads bets
  // don't have a line, and NRFI's is always 0.5.
  const wantsLine = kind === 'pick' && (
    betType === 'spread' || betType === 'total' ||
    betType === 'first_five' || betType === 'first_half'
  )
  const lineValue = line.trim() === '' ? null : Number(line)
  const lineValid = lineValue === null || Number.isFinite(lineValue)

  // Bet type is asked first, so this almost never fires — it's here for
  // the case where someone goes back and changes it, since "backing" is
  // meaningless once the bet is a total.
  // A bet type that no longer applies to the chosen league has to go, or
  // someone switches from MLB to NHL and silently posts a first-inning
  // bet on hockey.
  useEffect(() => {
    if (isPeriodBet(betType) && !availableBetTypes.some(b => b.value === betType)) {
      setBetType('moneyline')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueName])

  useEffect(() => {
    if (sentiment && !directions.some(d => d.value === sentiment)) setSentiment(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, betType])

  useEffect(() => {
    if (didScrollRef.current) return
    for (const box of [oddsScrollRef.current, stakeScrollRef.current]) {
      const active = box?.querySelector('.chip.active') as HTMLElement | null
      if (box && active) box.scrollLeft = Math.max(0, active.offsetLeft - 12)
    }
    didScrollRef.current = true
  }, [presetStake, oddsInput])

  const oddsText = `${oddsSign}${oddsInput}`

  // Derived, not remembered. If the number on screen is the number the
  // book was showing, this is a book price — however many times it was
  // changed on the way there.
  const fromBook = bookOdds !== null && oddsText === bookOdds
  const changedFromBook = bookOdds !== null && !fromBook

  function restoreBookOdds() {
    const parts = splitAmericanOdds(bookOdds)
    if (!parts) return
    setOddsCustom(!QUICK_ODDS.includes(bookOdds!))
    setOddsSign(parts.sign)
    setOddsInput(parts.digits)
  }
  const oddsValue = parseAmericanOdds(oddsText)
  const stake = stakeCustom ? Number(customStake) : presetStake
  const stakeValid = Number.isFinite(stake) && stake > 0 && stake <= MAX_STAKE

  const preview = useMemo(() => {
    if (oddsValue === null || !stakeValid) return null
    return { win: profitOnWin(oddsValue, stake), payout: payoutOnWin(oddsValue, stake) }
  }, [oddsValue, stake, stakeValid])

  function chooseOdds(o: string) {
    setOddsCustom(false)
    setOddsSign(o[0] as '+' | '-')
    setOddsInput(o.slice(1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!categoryId) { setError('Pick a league.'); return }
    if (!tag.trim()) { setError('Add a cashtag — it’s how posts get grouped.'); return }
    if (!sentiment) { setError(kind === 'take' ? 'Backing, neutral, or fading?' : `Pick a side — ${directions[0].label} or ${directions[1].label}.`); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    try { localStorage.setItem('gwuap:lastLeague', String(categoryId)) } catch {}

    if (kind === 'take') {
      if (!caption.trim()) { setError('Say something — a take needs words.'); return }
      setLoading(true)
      const { error: takeError } = await supabase.from('posts').insert({
        author_id: user.id,
        category_id: categoryId,
        post_kind: 'take',
        tag: tag.trim(),
        sentiment,
        caption: caption.trim(),
      })
      setLoading(false)
      if (takeError) { setError('Could not post — try again.'); return }
      router.push('/feed')
      return
    }

    if (oddsValue === null) {
      setError('Odds must be 100 or higher — that’s how American odds work (-110, +150). Drop the sign; the +/− buttons set it.')
      return
    }
    if (!stakeValid) {
      setError(`Enter a stake between $1 and ${formatUsd(MAX_STAKE)}.`)
      return
    }
    if (wantsLine && !lineValid) {
      setError(betType === 'total' ? 'The total has to be a number, like 47.5.' : 'The spread has to be a number, like -3.5.')
      return
    }

    setLoading(true)
    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId,
      post_kind: 'pick',
      tag: tag.trim(),
      // Kept for any pick tied to a fixture, not just the ones that ask
      // for an opponent. A spread arriving from a game card knows who it
      // is against, and dropping that made "$CHW +1.5" read as a bet on
      // nobody in particular.
      tag2: (showMatchup || gameId) && tag2.trim() ? tag2.trim() : null,
      sentiment,
      caption: caption.trim(),
      bet_type: betType,
      odds: oddsText,
      stake,
      potential_payout: payoutOnWin(oddsValue, stake),
      // A book price is a public fact. Anything else is the author's own
      // note until they decide otherwise.
      money_public: fromBook ? true : showMoney,
      game_id: gameId,
      game_league: gameId ? gameLeague : null,
      game_starts_at: gameId ? gameStartsAt : null,
      line: wantsLine ? lineValue : null,
      odds_source: fromBook ? 'book' : 'custom',
      odds_book: fromBook ? book : null,
    })

    setLoading(false)
    if (insertError) { setError('Could not post — try again.'); return }
    try { localStorage.setItem('gwuap:lastStake', String(stake)) } catch {}
    router.push('/feed')
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="display" style={{ fontSize: 20 }}>{kind === 'take' ? 'Post a take' : 'Post a pick'}</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <div className="segment" style={{ marginBottom: 14 }}>
          <button type="button" aria-pressed={kind === 'take'}
            className={kind === 'take' ? 'active' : ''}
            onClick={() => setKind('take')}>Take</button>
          <button type="button" aria-pressed={kind === 'pick'}
            className={kind === 'pick' ? 'active' : ''}
            onClick={() => setKind('pick')}>Pick</button>
        </div>

        {/* Bet type comes first: it decides whether the direction buttons
            read Backing/Fading or Over/Under, and whether there's an
            opponent field. Asking it up front means nothing downstream
            has to be cleared and re-answered. */}
        {kind === 'pick' && (
          <>
            <label className="form-label">Bet type</label>
            <div className="chip-line">
              <div className="chip-scroll">
              {availableBetTypes.map(b => (
                <button key={b.value} type="button" aria-pressed={betType === b.value}
                  className={`chip ${betType === b.value ? 'active' : ''}`}
                  onClick={() => setBetType(b.value)}>{b.label}</button>
              ))}
              </div>
            </div>
          </>
        )}

        <label className="form-label">League</label>
        <select className="field" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} required>
          <option value="">Choose a league…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="form-label">{showMatchup ? 'Teams' : 'Cashtag'}</label>
        <CashtagInput value={tag} onChange={setTag} league={leagueName} categoryId={categoryId} />

        {/* Once there's a league, the fixtures are knowable — so offer
            them rather than making someone leave, find the game, and come
            back. Hidden once a pick already came from a market: it's
            already filled in, and re-offering it would just be noise. */}
        {kind === 'pick' && !fromBook && <GamePicker league={leagueName} query={tag} />}
        {showMatchup && (
          <>
            <label className="form-label">Opponent — a total is on the game, not one team</label>
            <CashtagInput value={tag2} onChange={setTag2} league={leagueName} categoryId={categoryId} />
          </>
        )}

        {wantsLine && (
          <>
            <label className="form-label">
              {betType === 'total' ? 'The total' : 'The spread'}
            </label>
            <input
              className="field"
              type="text"
              inputMode="decimal"
              value={line}
              onChange={e => setLine(e.target.value)}
              placeholder={betType === 'total' ? '47.5' : '-3.5'}
            />
          </>
        )}

        {gameId && (
          <p className="form-hint">
            Graded automatically from the final score.
          </p>
        )}

        <label className="form-label">{showMatchup ? 'Over or under' : 'Which way'}</label>
        <div className="sentiment-toggle">
          {directions.map(d => (
            <button key={d.value} type="button" aria-pressed={sentiment === d.value}
              className={sentiment === d.value ? `active ${d.value}` : ''}
              onClick={() => setSentiment(d.value)}>{d.label}</button>
          ))}
        </div>
        {showPropHint && (
          <p className="field-hint">
            Most props are priced on a number, so this asks Over or Under.
            Betting a yes/no prop — anytime scorer, double-double? Pick{' '}
            <button type="button" className="link-btn" onClick={() => setBetType('other')}>Other</button>{' '}
            instead.
          </p>
        )}

        <MentionInput rows={3}
          placeholder={kind === 'take' ? "What's your take? @ someone, $ a team" : "What's the pick? Any reasoning?"}
          value={caption} onChange={setCaption} />

        {kind === 'pick' && (
          <>
            <label className="form-label">Odds</label>
            {fromBook ? (
              <p className="odds-locked">
                <strong>{oddsText}</strong> — {book ?? 'the book'}&apos;s price.
                Change it and this becomes a custom pick; change it back and
                it counts again.
              </p>
            ) : gameId && (
              <p className="form-hint">
                Typed prices are marked <strong>custom</strong>. Tap a market on the
                game page to post at a real one.
              </p>
            )}
            <div className="chip-line">
              <div className="chip-scroll" ref={oddsScrollRef}>
                {QUICK_ODDS.map(o => (
                  <button key={o} type="button" aria-pressed={!oddsCustom && oddsText === o}
                    className={`chip ${!oddsCustom && oddsText === o ? 'active' : ''}`}
                    onClick={() => chooseOdds(o)}>{o}</button>
                ))}
              </div>
              <button type="button" aria-pressed={oddsCustom}
                className={`chip chip-pinned ${oddsCustom ? 'active' : ''}`}
                onClick={() => setOddsCustom(true)}>Custom</button>
            </div>
            {oddsCustom && (
              <div className="odds-row">
                <div className="segment compact" style={{ flex: '0 0 auto' }}>
                  <button type="button" aria-pressed={oddsSign === '-'}
                    className={oddsSign === '-' ? 'active' : ''}
                    onClick={() => setOddsSign('-')}>− fav</button>
                  <button type="button" aria-pressed={oddsSign === '+'}
                    className={oddsSign === '+' ? 'active' : ''}
                    onClick={() => setOddsSign('+')}>+ dog</button>
                </div>
                <input className="field mono odds-input" inputMode="numeric" autoFocus
                  value={oddsInput} placeholder="110"
                  onChange={e => setOddsInput(e.target.value.replace(/[^0-9]/g, ''))} />
              </div>
            )}

            {changedFromBook && (
              <button type="button" className="restore-odds" onClick={restoreBookOdds}>
                ↩︎ Back to the {book ?? 'book'} price ({bookOdds})
              </button>
            )}

            {!fromBook && (
              <label className="money-toggle">
                <input type="checkbox" checked={showMoney}
                  onChange={e => setShowMoney(e.target.checked)} />
                <span>
                  <strong>Show these numbers publicly.</strong> They&apos;ll read as
                  self-reported — this price didn&apos;t come from a book, so it
                  never counts toward the leaderboard either way.
                </span>
              </label>
            )}

            <label className="form-label">Stake</label>
            <div className="chip-line">
              <div className="chip-scroll" ref={stakeScrollRef}>
                {STAKE_PRESETS.map(amount => (
                  <button key={amount} type="button" aria-pressed={!stakeCustom && presetStake === amount}
                    className={`chip ${!stakeCustom && presetStake === amount ? 'active' : ''}`}
                    onClick={() => { setStakeCustom(false); setPresetStake(amount) }}>{formatUsd(amount)}</button>
                ))}
              </div>
              <button type="button" aria-pressed={stakeCustom}
                className={`chip chip-pinned ${stakeCustom ? 'active' : ''}`}
                onClick={() => setStakeCustom(true)}>Custom</button>
            </div>
            {stakeCustom && (
              <div className="odds-row">
                <span className="currency-prefix mono">$</span>
                <input className="field mono" inputMode="decimal" autoFocus
                  value={customStake} placeholder="Amount risked"
                  onChange={e => setCustomStake(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
            )}

            <p className="bet-preview mono">
              {preview
                ? <>Risking <strong>{formatUsd(stake)}</strong> to win <strong className="pos">{formatUsd(preview.win)}</strong>
                    <span className="bet-preview-dim"> · returns {formatUsd(preview.payout)}</span></>
                : <span className="bet-preview-dim">Set odds and a stake to see what this pick pays.</span>}
            </p>
          </>
        )}

        {error && <p style={{ color: 'var(--bear)', fontSize: 14 }}>{error}</p>}
        <button className="btn" disabled={loading} type="submit">
          {loading ? 'Posting…' : kind === 'take' ? 'Post take' : 'Post pick'}
        </button>
      </form>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
        A <strong>take</strong> is a cashtag and an opinion — it never
        touches your record. A <strong>pick</strong> has money on it: your
        posted odds lock once you submit, only the result can change
        afterward, and every pick is timestamped, so your record reflects
        the price you actually called. Amounts are in US dollars.
      </p>
    </div>
  )
}
