import { squareResize, MAX_SOURCE_BYTES } from './image'

/**
 * Shrink a picture in the browser, then hand it to the server to store.
 *
 * The resize stays here — a phone photo is several megabytes and there's
 * no reason to send that — but the writing happens server-side, where
 * ownership is checked against the session rather than against a storage
 * policy nobody can read back.
 *
 * Returns a message rather than throwing, because every caller wants to
 * show it: both places that upload one treat a failed picture as
 * something to mention, not something to lose an account over.
 */
export async function uploadAvatar(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) return { error: 'That file isn’t an image.' }
  if (file.size > MAX_SOURCE_BYTES) return { error: 'That image is enormous — try one under 25MB.' }

  let resized: Blob
  try {
    resized = await squareResize(file)
  } catch {
    return { error: 'Couldn’t read that image. Try a JPEG or PNG.' }
  }

  const form = new FormData()
  form.append('file', new File([resized], 'avatar.jpg', { type: 'image/jpeg' }))

  try {
    const res = await fetch('/api/avatar', { method: 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body?.error ?? `Upload failed (${res.status}).` }
    if (!body?.url) return { error: 'Upload succeeded but returned no address.' }
    return { url: body.url as string }
  } catch {
    return { error: 'Could not reach the server — try again.' }
  }
}
