'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import {
  BET_TYPES, STAKE_PRESETS, MAX_STAKE,
  parseAmericanOdds, profitOnWin, payoutOnWin, formatUsd,
  type BetType,
} from '@/lib/odds'

export default function NewPostPage() {
  const supabase = createClient()
  const router = useRouter()
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

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('categories').select('id, name').then(({ data }) => setCategories(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    let slip_image_url: string | null = null
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('bet-slips').upload(path, file)
      if (uploadError) { setError('Image upload failed.'); setLoading(false); return }
      const { data } = supabase.storage.from('bet-slips').getPublicUrl(path)
      slip_image_url = data.publicUrl
    }

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId || null,
      tag: tag || null,
      sentiment,
      caption,
      bet_type: betType,
      odds: oddsText,
      stake,
      potential_payout: payoutOnWin(oddsValue, stake),
      slip_image_url,
    })

    setLoading(false)
    if (insertError) { setError('Could not post — try again.'); return }
    router.push('/feed')
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h1 className="display" style={{ fontSize: 20 }}>Post a pick</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <input className="field mono" placeholder="Cashtag, e.g. $LAL -4.5" value={tag}
          onChange={e => setTag(e.target.value)} />

        <div className="sentiment-toggle">
          <button type="button" className={`${sentiment === 'backing' ? 'active backing' : ''}`}
            onClick={() => setSentiment('backing')}>Backing</button>
          <button type="button" className={`${sentiment === 'fading' ? 'active fading' : ''}`}
            onClick={() => setSentiment('fading')}>Fading</button>
        </div>

        <select className="field" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} required>
          <option value="">Choose a league…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <textarea className="field" placeholder="What's the pick? Any reasoning?" rows={3}
          value={caption} onChange={e => setCaption(e.target.value)} />

        <label className="form-label">Bet type</label>
        <div className="segment">
          {BET_TYPES.map(b => (
            <button key={b.value} type="button" aria-pressed={betType === b.value}
              className={betType === b.value ? 'active' : ''}
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
        <div className="stake-chips">
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

        <label className="form-label">Betting slip screenshot (optional)</label>
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 12, color: 'var(--ink-dim)' }} />

        {error && <p style={{ color: 'var(--bear)', fontSize: 14 }}>{error}</p>}
        <button className="btn" disabled={loading} type="submit">{loading ? 'Posting…' : 'Post pick'}</button>
      </form>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
        Every pick is marked Unverified — real verification (synced to your
        actual sportsbook account) is a planned future feature. Amounts are
        in US dollars.
      </p>
    </div>
  )
}
