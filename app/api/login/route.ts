import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient, createAdminClient } from '@/lib/supabaseServer'
import { isValidUsername } from '@/lib/username'

export const dynamic = 'force-dynamic'

/**
 * Where the request came from, hashed.
 *
 * Vercel sets `x-forwarded-for` and appends to it, so the first entry is
 * the client. It is spoofable in principle and an attacker can rotate
 * addresses anyway — this is one more thing to get past, not a wall, and
 * it should not be described as one.
 *
 * Hashed rather than stored: counting needs only that two attempts
 * match, and keeping the addresses would mean holding a record of who
 * tried to sign in from where, which this site has no use for.
 */
function sourceKey(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = fwd || req.headers.get('x-real-ip')?.trim()
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex')
}

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
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 400 })
  }
  // Checked before it reaches the database, not for tidiness: the lookup
  // below is an `ilike`, so a `%` or `_` in here is a wildcard. One
  // account can be named by any number of patterns, and the throttle is
  // keyed on the string it was given — so without this, ten attempts per
  // username per fifteen minutes is ten attempts per *pattern*, and
  // there is no limit on patterns. See lib/username.ts.
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 })
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
  //
  // Two counters, because they stop different attacks. Per username
  // stops one account being hammered. Per source stops the one that
  // actually works at scale: a single likely password tried against a
  // thousand usernames, where counting per username hands every guess a
  // fresh bucket.
  const CEILING = 10
  const SOURCE_CEILING = 30
  const since = new Date(Date.now() - 15 * 60_000).toISOString()
  const source = sourceKey(req)

  // Sweep first, unconditionally. This used to hang off a *successful*
  // login, which meant a run of failures against many usernames piled up
  // rows that nothing would ever clear — the exact situation the table
  // exists to detect was also the one where it never got tidied. Doing it
  // here costs one indexed delete on a table whose rows all expire within
  // the hour, so it stays small by construction.
  await admin.from('login_attempts')
    .delete()
    .lt('created_at', new Date(Date.now() - 60 * 60_000).toISOString())

  const [{ count: recent }, { count: fromSource }] = await Promise.all([
    admin.from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('username_key', key).gte('created_at', since),
    source
      ? admin.from('login_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('ip_key', source).gte('created_at', since)
      : Promise.resolve({ count: 0 }),
  ])

  // The source ceiling is deliberately loose. Carrier NAT and offices put
  // many real people behind one address, so a tight limit locks out
  // bystanders; thirty in fifteen minutes is far more than anyone types
  // by hand and far less than a spray needs.
  if ((recent ?? 0) >= CEILING || (fromSource ?? 0) >= SOURCE_CEILING) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a few minutes and try again.' },
      { status: 429 },
    )
  }

  // Recorded before the attempt, not after, so a crash or a timeout
  // can't be used to get a free guess.
  await admin.from('login_attempts').insert({ username_key: key, ip_key: source })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username')
    .ilike('username', username.trim())
    .maybeSingle()

  if (!profile) return deny()

  // The format check above stops `%`, but `_` is a legal username
  // character *and* a single-character LIKE wildcard — so `jbreezy82_`
  // gets through it and still matches `jbreezy823`. Rather than escape
  // the pattern, insist the row we found is the row that was asked for.
  // Any pattern that resolved to some other name fails here whatever the
  // password is, which leaves the exact username as the only string that
  // can authenticate, and therefore the only key worth throttling.
  if (profile.username.toLowerCase() !== key) return deny()

  const { data: found, error: lookupError } = await admin.auth.admin.getUserById(profile.id)
  const email = found?.user?.email
  if (lookupError || !email) return deny()

  // Signing in through the server client is what writes the session
  // cookies the browser will read on its next load.
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return deny()

  // A correct password clears the count, so someone who mistyped a few
  // times isn't locked out of their own account afterwards.
  //
  // Only the username's rows, not the source's: clearing the source
  // count on success would let an attacker who owns one valid account
  // reset their own spray budget by logging into it.
  await admin.from('login_attempts').delete().eq('username_key', key)

  return NextResponse.json({ ok: true })
}
