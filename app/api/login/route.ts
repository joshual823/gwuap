import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

/**
 * Log in with a username.
 *
 * The email lives in auth.users, which the browser can't read, and it
 * must not move to profiles — that table is world-readable, so storing
 * emails there would publish every address on the site.
 *
 * So the resolution and the sign-in both happen here: the username is
 * turned into a user id with the service role, and the session is
 * established server-side. The address is never returned, so this can't
 * be used to harvest one, and a wrong username and a wrong password give
 * the same answer so it can't enumerate accounts either.
 */
export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}))
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 400 })
  }

  const deny = () =>
    NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Login by username is unavailable.' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username.trim())
    .maybeSingle()

  if (!profile) return deny()

  const { data: found, error: lookupError } = await admin.auth.admin.getUserById(profile.id)
  const email = found?.user?.email
  if (lookupError || !email) return deny()

  // Signing in through the server client is what writes the session
  // cookies the browser will read on its next load.
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return deny()

  return NextResponse.json({ ok: true })
}
