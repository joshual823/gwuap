import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { fetchClips, CLIP_FEEDS } from '@/lib/clips'
import { cleanPreferences } from '@/lib/preferences'
import FeedTabs from '@/components/FeedTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Highlights' }

export default async function ClipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: prefRow } = user
    ? await supabase.from('profiles').select('preferred_leagues').eq('id', user.id).maybeSingle()
    : { data: null }
  const preferred = cleanPreferences(prefRow?.preferred_leagues)
  const clips = await fetchClips(preferred, 40)

  return (
    <div>
      <FeedTabs active="home" />
      <h1 className="display" style={{ fontSize: 22, marginTop: 20 }}>Highlights</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, margin: '4px 0 16px' }}>
        Straight from {CLIP_FEEDS.map(f => f.league).join(', ')} — their channels,
        their players. We don&apos;t host any of it.
      </p>

      {clips.length === 0 ? (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
          Nothing new right now. Highlights land within minutes of a game finishing.
        </p>
      ) : (
        <div className="clip-grid">
          {clips.map(c => (
            <Link key={c.id} href={`/clips/${c.id}`} className="clip-card clip-tile">
              <span className="clip-thumb">
                {c.thumbnail ? <img src={c.thumbnail} alt="" loading="lazy" /> : <span className="clip-thumb-blank" />}
                <span className="clip-play">▶</span>
              </span>
              <span className="clip-league">{c.league}</span>
              <span className="clip-title">{c.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
