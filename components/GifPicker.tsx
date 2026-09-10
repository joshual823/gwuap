'use client'
import { useEffect, useState } from 'react'

type Gif = { id: string; preview: string; url: string; description: string }

/**
 * Tenor's library, in a panel.
 *
 * Nothing is uploaded and nothing is stored: picking one posts a link to
 * Tenor's copy. The search goes through our own route so the key stays
 * on the server, and Tenor's strictest content filter is applied there.
 *
 * With no key set the panel says so instead of sitting empty, because an
 * empty grid looks like a broken feature rather than an unconfigured one.
 */
export default function GifPicker({ onPick, onClose }: {
  onPick: (url: string, description: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [configured, setConfigured] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifs?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (cancelled) return
        setGifs(data.gifs ?? [])
        setConfigured(data.configured !== false)
      } catch {
        if (!cancelled) setGifs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 220)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [q])

  return (
    <div className="gif-panel">
      <div className="gif-head">
        <input className="field" value={q} autoFocus placeholder="Search GIFs…"
          onChange={e => setQ(e.target.value)} />
        <button type="button" className="gif-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {!configured ? (
        <p className="rec-note">
          GIFs aren&apos;t switched on — TENOR_API_KEY isn&apos;t set.
        </p>
      ) : loading && gifs.length === 0 ? (
        <p className="rec-note">Looking…</p>
      ) : gifs.length === 0 ? (
        <p className="rec-note">Nothing for that.</p>
      ) : (
        <div className="gif-grid">
          {gifs.map(g => (
            <button key={g.id} type="button" className="gif-cell"
              onClick={() => onPick(g.url, g.description)}
              aria-label={g.description}>
              <img src={g.preview} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="gif-credit">GIFs via Tenor</p>
    </div>
  )
}
