'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import ScrollPicker from '@/components/ScrollPicker'

const CURRENCIES = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: '¥', label: 'JPY (¥)' },
  { symbol: 'u', label: 'Units (u)' },
]

export default function NewPostPage() {
  const supabase = createClient()
  const router = useRouter()
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [tag, setTag] = useState('')
  const [sentiment, setSentiment] = useState<'backing' | 'fading'>('backing')
  const [caption, setCaption] = useState('')

  const [oddsSign, setOddsSign] = useState<'+' | '-'>('-')
  const [oddsValue, setOddsValue] = useState(110)   // scroll picker: 1–10,000

  const [stake, setStake] = useState(50)            // scroll picker: 1–1,000,000, step 5
  const [currency, setCurrency] = useState('$')

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('categories').select('id, name').then(({ data }) => setCategories(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

    const odds = `${oddsSign}${oddsValue}`

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      category_id: categoryId || null,
      tag: tag || null,
      sentiment,
      caption,
      odds,
      stake,
      currency,
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

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6 }}>
          Odds — type or scroll
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="field" style={{ marginBottom: 0, flex: '0 0 90px', height: 120 }}
            value={oddsSign} onChange={e => setOddsSign(e.target.value as '+' | '-')}>
            <option value="-">− fav</option>
            <option value="+">+ dog</option>
          </select>
          <ScrollPicker min={1} max={10000} step={1} value={oddsValue} onChange={setOddsValue} />
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', margin: '4px 0 6px' }}>
          Stake — type or scroll
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="field" style={{ marginBottom: 0, flex: '0 0 120px', height: 120 }}
            value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c.symbol} value={c.symbol}>{c.label}</option>)}
          </select>
          <ScrollPicker min={1} max={1000000} step={5} value={stake} onChange={setStake} />
        </div>

        <label style={{ display: 'block', fontSize: 13, color: 'var(--ink-dim)', margin: '4px 0 6px' }}>
          Betting slip screenshot (optional)
        </label>
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 12, color: 'var(--ink-dim)' }} />

        {error && <p style={{ color: 'var(--bear)', fontSize: 14 }}>{error}</p>}
        <button className="btn" disabled={loading} type="submit">{loading ? 'Posting…' : 'Post pick'}</button>
      </form>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
        Every pick is marked Unverified for now — real verification (synced
        to your actual sportsbook account) is a planned future feature.
      </p>
    </div>
  )
}
