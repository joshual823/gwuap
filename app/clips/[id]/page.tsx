import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchClips, embedFor, watchOn } from '@/lib/clips'
import { createClient } from '@/lib/supabaseServer'
import ClipComments from '@/components/ClipComments'
import ShareRow from '@/components/ShareRow'
import { SITE_URL } from '@/lib/brand'

export const dynamic = 'force-dynamic'

/** YouTube ids are 11 characters of URL-safe base64. */
const ID_RE = /^[\w-]{11}$/

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!ID_RE.test(id)) return { title: 'Highlight' }
  const clip = (await fetchClips([], { limit: 60, perLeague: 15 })).find(c => c.id === id)
  return { title: clip?.title ?? 'Highlight', robots: { index: false, follow: false } }
}

export default async function ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // The id goes into an iframe src, so it's checked rather than trusted —
  // anything else here would be somebody choosing what this page embeds.
  if (!ID_RE.test(id)) notFound()

  const clips = await fetchClips([], { limit: 60, perLeague: 15 })
  const clip = clips.find(c => c.id === id)
  const rest = clips.filter(c => c.id !== id).slice(0, 6)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ marginTop: 20 }}>
      <p className="rec-back"><Link href="/clips" className="help-link">← Highlights</Link></p>

      <div className="clip-player">
        <iframe
          src={embedFor(id)}
          title={clip?.title ?? 'Highlight'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {clip && (
        <>
          <h1 className="clip-page-title">{clip.title}</h1>
          <p className="clip-page-meta">
            {clip.league} · posted by the league.{' '}
            <a href={watchOn(id)} target="_blank" rel="noreferrer" className="help-link">
              Watch on YouTube
            </a>
          </p>
        </>
      )}

      <ShareRow url={`${SITE_URL}/clips/${id}`} text={clip?.title ?? 'Highlight'} />

      <ClipComments videoId={id} viewerId={user?.id ?? null} />

      {rest.length > 0 && (
        <>
          <h2 className="rec-h2" style={{ marginTop: 26 }}>More highlights</h2>
          <div className="clip-grid">
            {rest.map(c => (
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
        </>
      )}
    </div>
  )
}
