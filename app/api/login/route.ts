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
  const key = username.trim().toLowerCase()

  // Guessing is cheap and this route can't lean on Supabase's per-client
  // limit — every attempt arrives from the same server address, so that
  // limit would throttle all users together and barely slow one attacker.
  const CEILING = 10
  const since = new Date(Date.now() - 15 * 60_000).toISOString()

  const { count: recent } = await admin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('username_key', key)
    .gte('created_at', since)

  if ((recent ?? 0) >= CEILING) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a few minutes and try again.' },
      { status: 429 },
    )
  }

  // Recorded before the attempt, not after, so a crash or a timeout
  // can't be used to get a free guess.
  await admin.from('login_attempts').insert({ username_key: key })

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

  // A correct password clears the count, so someone who mistyped a few
  // times isn't locked out of their own account afterwards. Old rows go
  // too, since nothing reads them once the window has passed.
  await admin.from('login_attempts').delete().eq('username_key', key)
  await admin.from('login_attempts')
    .delete()
    .lt('created_at', new Date(Date.now() - 60 * 60_000).toISOString())

  return NextResponse.json({ ok: true })
}
