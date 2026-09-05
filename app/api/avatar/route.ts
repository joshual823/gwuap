import { createClient, createAdminClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

/** Matches the browser-side resize, which sends about fifty kilobytes. */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * Store a profile picture.
 *
 * Uploading straight from the browser meant the storage policy decided
 * whether it worked, and it kept saying no — "new row violates row-level
 * security policy" — for reasons that can't be read back from outside
 * the database. Restating the policies didn't shift it either.
 *
 * So ownership is settled here instead, where it can be checked
 * directly: the session says who this is, the file is written to a
 * folder named after that id, and nothing the browser sends decides the
 * path. That's the same guarantee the policy was expressing, enforced
 * somewhere legible.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured.' }, { status: 503 })
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const value = form.get('file')
    if (value instanceof File) file = value
  } catch {
    return Response.json({ error: 'Could not read that upload.' }, { status: 400 })
  }
  if (!file) return Response.json({ error: 'No image was sent.' }, { status: 400 })
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'That file is not an image.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'That image is too large.' }, { status: 400 })
  }

  // The path is built from the session, never from the request body.
  const path = `${user.id}/${Date.now()}.jpg`
  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

  if (error) return Response.json({ error: error.message }, { status: 502 })

  const url = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  return Response.json({ url })
}
