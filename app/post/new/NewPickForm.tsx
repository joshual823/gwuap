'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import CashtagInput from '@/components/CashtagInput'
import {
  BET_TYPES, STAKE_PRESETS, MAX_STAKE,
  parseAmericanOdds, profitOnWin, payoutOnWin, formatUsd,
  type BetType,
} from '@/lib/odds'

export default function NewPickForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [tag, setTag] = useState('')
  const [sentiment, setSentiment] = useState<'backing' | 'fading'>('backing')
  const [caption, setCaption] = useState('')

  const [betType, setBetType] = useState<BetType>('moneyline')
  const [oddsSign, setOddsSign] = useState<'+' | '-'>('-')
  const [oddsInput, setOddsInput] = useState('110')

  // Stake is a quick-select chip unless "Custom" is chosen, in which case
  // the typed value in customStake takes over.
  const [presetStake, setPresetStake] = useState<number>(50)
  const [customMode, setCustomMode] = useState(false)
  const [customStake, setCustomStake] = useState('')

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
        if (match) setCategoryId(match.id)
      }
    })
    const headline = searchParams.get('headline')
    if (headline) setCaption(headline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leagueName = categories.find(c => c.id === categoryId)?.name ?? null

  const oddsText = `${oddsSign}${oddsInput}`
  const oddsValue = parseAmericanOdds(oddsText)
  const stake = customMode ? Number(customStake) : presetStake
  const stakeValid = Number.isFinite(stake) && stake > 0 && stake <= MAX_STAKE

  // Live "risk this, win that" line under the stake row.
  const preview = useMemo(() => {
    if (oddsValue === null || !stakeValid) return null
    return {
      win: profitOnWin(oddsValue, stake),
      payout: payoutOnWin(oddsValue, stake),
    }
  }, [oddsValue, stake, stakeValid])

  function selectPreset(amount: number) {
    setCustomMode(false)
    setPresetStake(amount)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (oddsValue === null) {
      setError('Odds must be 100 or higher — that’s how American odds work (-110, +150). Drop the sign; the +/- buttons set it.')
      return
    }
    if (!stakeValid) {
      setError(`Enter a stake between $1 and ${formatUsd(MAX_STAKE)}.`)
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId || null,
      tag: tag.trim() || null,
      sentiment,
      caption,
      bet_type: betType,
      odds: oddsText,
      stake,
      potential_payout: payoutOnWin(oddsValue, stake),
    })

    setLoading(false)
    if (insertError) { setError('Could not post — try again.'); return }
    router.push('/feed')
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="display" style={{ fontSize: 20 }}>Post a pick</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <select className="field" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} required>
          <option value="">Choose a league…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <CashtagInput value={tag} onChange={setTag} league={leagueName} />

        <div className="sentiment-toggle">
          <button type="button" className={`${sentiment === 'backing' ? 'active backing' : ''}`}
            onClick={() => setSentiment('backing')}>Backing</button>
          <button type="button" className={`${sentiment === 'fading' ? 'active fading' : ''}`}
            onClick={() => setSentiment('fading')}>Fading</button>
        </div>

        <textarea className="field" placeholder="What's the pick? Any reasoning?" rows={3}
          value={caption} onChange={e => setCaption(e.target.value)} />

        <label className="form-label">Bet type</label>
        <div className="chip-grid">
          {BET_TYPES.map(b => (
            <button key={b.value} type="button" aria-pressed={betType === b.value}
              className={`chip ${betType === b.value ? 'active' : ''}`}
              onClick={() => setBetType(b.value)}>{b.label}</button>
          ))}
        </div>

        <label className="form-label" htmlFor="odds-input">Odds</label>
        <div className="odds-row">
          <div className="segment compact" style={{ flex: '0 0 auto' }}>
            <button type="button" aria-pressed={oddsSign === '-'}
              className={oddsSign === '-' ? 'active' : ''}
              onClick={() => setOddsSign('-')}>− fav</button>
            <button type="button" aria-pressed={oddsSign === '+'}
              className={oddsSign === '+' ? 'active' : ''}
              onClick={() => setOddsSign('+')}>+ dog</button>
          </div>
          <input id="odds-input" className="field mono odds-input" inputMode="numeric"
            value={oddsInput} placeholder="110"
            onChange={e => setOddsInput(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>

        <label className="form-label">Stake</label>
        <div className="chip-grid">
          {STAKE_PRESETS.map(amount => (
            <button key={amount} type="button" aria-pressed={!customMode && presetStake === amount}
              className={`chip ${!customMode && presetStake === amount ? 'active' : ''}`}
              onClick={() => selectPreset(amount)}>{formatUsd(amount)}</button>
          ))}
          <button type="button" aria-pressed={customMode}
            className={`chip ${customMode ? 'active' : ''}`}
            onClick={() => setCustomMode(true)}>Custom</button>
        </div>
        {customMode && (
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

        {error && <p style={{ color: 'var(--bear)', fontSize: 14 }}>{error}</p>}
        <button className="btn" disabled={loading} type="submit">{loading ? 'Posting…' : 'Post pick'}</button>
      </form>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
        Picks are self-reported. Your posted odds are locked once you
        submit — only the result can change afterward — and every pick is
        timestamped, so the record reflects the price you actually called.
        Amounts are in US dollars. Bet slip uploads are off for now.
      </p>
    </div>
  )
}
