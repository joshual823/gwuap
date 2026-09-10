export const dynamic = 'force-dynamic'

/**
 * GIF search, through Tenor.
 *
 * Proxied rather than called from the browser so the key stays on the
 * server — a key in the page is a key anybody can spend, and Tenor's
 * free tier is a quota like any other.
 *
 * Nothing is uploaded or stored: a GIF is a link to Tenor's copy, which
 * is also why this is the one kind of image that needed no moderation
 * story of its own. `contentfilter=high` is Tenor's strictest, and it's
 * the right setting for a room somebody's friends are in.
 *
 * Inert without TENOR_API_KEY, like every other optional integration
 * here: no key, no picker, and the room still works.
 */
export async function GET(request: Request) {
  const key = process.env.TENOR_API_KEY
  if (!key) return Response.json({ gifs: [], configured: false })

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60)

  const endpoint = q
    ? 'https://tenor.googleapis.com/v2/search'
    : 'https://tenor.googleapis.com/v2/featured'

  const url = `${endpoint}?key=${encodeURIComponent(key)}` +
    `&client_key=gwuap&limit=24&contentfilter=high&media_filter=tinygif,gif` +
    (q ? `&q=${encodeURIComponent(q)}` : '')

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return Response.json({ gifs: [], configured: true })
    const data = await res.json()

    const gifs = (Array.isArray(data?.results) ? data.results : [])
      .map((r: any) => ({
        id: String(r?.id ?? ''),
        // tinygif for the grid, gif for what actually gets posted.
        preview: r?.media_formats?.tinygif?.url ?? null,
        url: r?.media_formats?.gif?.url ?? r?.media_formats?.tinygif?.url ?? null,
        description: String(r?.content_description ?? 'GIF').slice(0, 120),
      }))
      .filter((g: any) => g.id && g.preview && g.url)

    return Response.json({ gifs, configured: true })
  } catch {
    // A dead upstream is a picker with nothing in it, never a broken room.
    return Response.json({ gifs: [], configured: true })
  }
}
