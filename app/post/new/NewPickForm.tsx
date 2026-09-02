'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import CashtagInput from '@/components/CashtagInput'
import {
  BET_TYPES, STAKE_PRESETS, MAX_STAKE,
  parseAmericanOdds, profitOnWin, payoutOnWin, formatUsd,
  directionsFor, wantsMatchup, isPropBet, QUICK_ODDS,
  type BetType, type PostKind, type Direction,
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
    try {
      const lastStake = Number(localStorage.getItem('gwuap:lastStake'))
      if (Number.isFinite(lastStake) && lastStake > 0) {
        if (STAKE_PRESETS.includes(lastStake)) setPresetStake(lastStake)
        else { setStakeCustom(true); setCustomStake(String(lastStake)) }
      }
    } catch { /* ditto */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const directions = directionsFor(kind, betType)
  const showMatchup = wantsMatchup(kind, betType)
  const showPropHint = isPropBet(kind, betType)
  const leagueName = categories.find(c => c.id === categoryId)?.name ?? null

  // Bet type is asked first, so this almost never fires — it's here for
  // the case where someone goes back and changes it, since "backing" is
  // meaningless once the bet is a total.
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
    if (!sentiment) { setError(`Pick a side — ${directions[0].label} or ${directions[1].label}.`); return }

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

    setLoading(true)
    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId,
      post_kind: 'pick',
      tag: tag.trim(),
      tag2: showMatchup && tag2.trim() ? tag2.trim() : null,
      sentiment,
      caption: caption.trim(),
      bet_type: betType,
      odds: oddsText,
      stake,
      potential_payout: payoutOnWin(oddsValue, stake),
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
              {BET_TYPES.map(b => (
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
        {showMatchup && (
          <>
            <label className="form-label">Opponent — a total is on the game, not one team</label>
            <CashtagInput value={tag2} onChange={setTag2} league={leagueName} categoryId={categoryId} />
          </>
        )}

        <label className="form-label">{showMatchup ? 'Over or under' : 'Which way'}</label>
        <div className="sentiment-toggle">
          {directions.map((d, i) => (
            <button key={d.value} type="button" aria-pressed={sentiment === d.value}
              className={sentiment === d.value ? `active ${i === 0 ? 'backing' : 'fading'}` : ''}
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

        <textarea className="field" rows={3}
          placeholder={kind === 'take' ? "What's your take?" : "What's the pick? Any reasoning?"}
          value={caption} onChange={e => setCaption(e.target.value)} />

        {kind === 'pick' && (
          <>
            <label className="form-label">Odds</label>
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
