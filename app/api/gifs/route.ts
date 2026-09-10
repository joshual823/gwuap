export const dynamic = 'force-dynamic'

/**
 * GIF search, through GIPHY.
 *
 * This was built against Tenor first, which was a mistake worth
 * recording rather than quietly fixing: **Tenor stopped accepting new
 * API clients in January 2026** and carries a service-discontinuation
 * notice. The integration was written before anyone checked whether a
 * key could still be had. Check that an API is open before building on
 * it, not after.
 *
 * GIPHY still issues free keys. The free tier is rate-limited — roughly
 * a hundred calls an hour — which is far past what this site does, and
 * the route caches for five minutes on top of that.
 *
 * Proxied rather than called from the browser so the key stays on the
 * server: a key in the page is a key anybody can spend.
 *
 * Nothing is uploaded or stored. A GIF is a link to GIPHY's copy, which
 * is why this is the one kind of image that needed no moderation story
 * of its own — `rating=pg` is applied here, on the server, where it
 * can't be edited by the caller.
 *
 * Inert without GIPHY_API_KEY, like every optional integration here: no
 * key, no picker, and the room still works.
 */
export async function GET(request: Request) {
  const key = process.env.GIPHY_API_KEY
  if (!key) return Response.json({ gifs: [], configured: false })

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60)

  const base = q
    ? 'https://api.giphy.com/v1/gifs/search'
    : 'https://api.giphy.com/v1/gifs/trending'

  // `bundle=messaging_non_clips` is GIPHY's own selection for chat: it
  // drops the video-style clips, which don't behave like a GIF in a
  // message, and returns the renditions sized for one.
  const url = `${base}?api_key=${encodeURIComponent(key)}` +
    `&limit=24&rating=pg&bundle=messaging_non_clips` +
    (q ? `&q=${encodeURIComponent(q)}` : '')

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return Response.json({ gifs: [], configured: true })
    const data = await res.json()

    const gifs = (Array.isArray(data?.data) ? data.data : [])
      .map((g: any) => ({
        id: String(g?.id ?? ''),
        // A small still-sized rendition for the grid, and a full one for
        // what actually gets posted.
        preview: g?.images?.fixed_width_small?.url ?? g?.images?.preview_gif?.url ?? null,
        url: g?.images?.fixed_width?.url ?? g?.images?.original?.url ?? null,
        description: String(g?.title || 'GIF').slice(0, 120),
      }))
      .filter((g: any) => g.id && g.preview && g.url)

    return Response.json({ gifs, configured: true })
  } catch {
    // A dead upstream is a picker with nothing in it, never a broken room.
    return Response.json({ gifs: [], configured: true })
  }
}
