import { createClient, createAdminClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

/** The browser resizes first, so anything larger than this is a mistake. */
const MAX_BYTES = 3 * 1024 * 1024

/**
 * A picture posted into a squad room.
 *
 * Same arrangement as /api/avatar and for the same reason: the file is
 * written with the service role after the session has been checked here,
 * where the check can be read, rather than inside a storage policy that
 * can only say no.
 *
 * Membership is the whole gate. A squad room is members-only, so the
 * pictures in it have to be too — otherwise the room is private and its
 * contents aren't, which is worse than not having pictures.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured.' }, { status: 503 })
  }

  let file: File | null = null
  let squadId = ''
  try {
    const form = await req.formData()
    const value = form.get('file')
    if (value instanceof File) file = value
    const squad = form.get('squad')
    if (typeof squad === 'string') squadId = squad
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
  if (!squadId) return Response.json({ error: 'No squad given.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('squad_members')
    .select('user_id')
    .eq('squad_id', squadId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) {
    return Response.json({ error: 'You are not in that squad.' }, { status: 403 })
  }

  // Path from the session and the squad, never from the request body.
  // Timestamped rather than overwritten: unlike an avatar these are a
  // conversation, and each one has to stay where it was posted.
  const path = `${user.id}/squad/${squadId}/${Date.now()}.jpg`
  const { error } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: false, contentType: 'image/jpeg' })
  if (error) return Response.json({ error: error.message }, { status: 502 })

  const url = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  return Response.json({ url })
}
