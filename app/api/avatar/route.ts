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
  let squadId: string | null = null
  try {
    const form = await req.formData()
    const value = form.get('file')
    if (value instanceof File) file = value
    const squad = form.get('squad')
    if (typeof squad === 'string' && squad) squadId = squad
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

  const admin = createAdminClient()

  // A squad picture is the owner's to set, and only the owner's. Checked
  // here rather than left to a storage policy, because a policy can only
  // refuse the write — it can't say which squad the caller meant.
  if (squadId !== null) {
    const { data: squad } = await admin
      .from('squads').select('id, owner_id').eq('id', squadId).maybeSingle()
    if (!squad) return Response.json({ error: 'No such squad.' }, { status: 404 })
    if (squad.owner_id !== user.id) {
      return Response.json({ error: 'Only the owner can change a squad picture.' }, { status: 403 })
    }
  }

  // The path is built from the session, never from the request body.
  //
  // One file per account rather than one per upload. A timestamped name
  // meant every upload kept the last, so any signed-in account could
  // fill the bucket two megabytes at a time and nothing ever reclaimed
  // it — the only limit was patience. Overwriting caps it at one file
  // per person; the version below is what stops the browser showing the
  // old picture from cache.
  // A squad's file is named for the squad, still under a folder the
  // session owns, so one account can't fill the bucket by uploading on
  // behalf of squads it doesn't own — the check above already refused
  // that, and this makes it true of the path as well.
  const path = squadId ? `${user.id}/squad-${squadId}.jpg` : `${user.id}/avatar.jpg`
  const { error } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

  if (error) return Response.json({ error: error.message }, { status: 502 })

  // Same path every time, so the URL has to change or nobody sees the
  // new picture — theirs least of all, since their browser has the old
  // one freshest.
  const base = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  return Response.json({ url: `${base}?v=${Date.now()}` })
}
