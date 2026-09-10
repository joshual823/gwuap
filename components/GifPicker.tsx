'use client'
import { useEffect, useState } from 'react'
import { STICKERS, stickerUrl } from '@/lib/stickers'

type Gif = { id: string; preview: string; url: string; description: string }

/**
 * Reactions, and GIFs if a key ever appears.
 *
 * Two tabs, and the order matters: **Reactions is first and always
 * works**. It's Google's openly-licensed animated emoji, served from
 * their CDN — nothing to sign up for, nothing to store, no key to leak.
 * That's there because both GIF services turned out to be a door that
 * might not open: Tenor closed to new clients, and GIPHY's signup 404s.
 *
 * A feature that only works once somebody grants you a key is a feature
 * that might never work, so the one that needs nothing is the default
 * and the other is the upgrade.
 *
 * GIPHY's library, in the second tab.
 *
 * Nothing is uploaded and nothing is stored: picking one posts a link to
 * GIPHY's copy. The search goes through our own route so the key stays
 * on the server, and the content rating is applied there where the
 * caller can't change it.
 *
 * With no key set the panel says so instead of sitting empty, because an
 * empty grid looks like a broken feature rather than an unconfigured one.
 */
export default function GifPicker({ onPick, onClose }: {
  onPick: (url: string, description: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'reactions' | 'gifs'>('reactions')
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
        <div className="gif-tabs">
          <button type="button" className={`gif-tab ${tab === 'reactions' ? 'active' : ''}`}
            onClick={() => setTab('reactions')}>Reactions</button>
          {/* Hidden entirely when there's no key. An empty tab is worse
              than no tab — it looks like the thing is broken. */}
          {configured && (
            <button type="button" className={`gif-tab ${tab === 'gifs' ? 'active' : ''}`}
              onClick={() => setTab('gifs')}>GIFs</button>
          )}
        </div>
        <button type="button" className="gif-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {tab === 'reactions' ? (
        <>
          <div className="gif-grid">
            {STICKERS.map(s => (
              <button key={s.code} type="button" className="gif-cell"
                onClick={() => onPick(stickerUrl(s.code), s.label)}
                title={s.label} aria-label={s.label}>
                <img src={stickerUrl(s.code)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <p className="gif-credit">Animated emoji by Google (Noto)</p>
        </>
      ) : (
      <>
      <input className="field" value={q} autoFocus placeholder="Search GIFs…"
        style={{ marginTop: 8 }} onChange={e => setQ(e.target.value)} />
      {!configured ? (
        <p className="rec-note">
          GIFs aren&apos;t switched on — GIPHY_API_KEY isn&apos;t set.
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
      <p className="gif-credit">Powered by GIPHY</p>
      </>
      )}
    </div>
  )
}
