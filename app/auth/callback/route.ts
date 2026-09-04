import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

/**
 * Where Supabase sends someone back to — after a password-reset link,
 * and after signing in with Google.
 *
 * The link carries a one-time code that has to be exchanged for a
 * session before anything else can happen.
 *
 * An account created through Google arrives with no username, and a
 * username is the whole identity here — every profile URL, every
 * cashtag mention, every post header. So a session without a profile is
 * sent to claim one rather than let loose on a site that would render
 * them as nobody.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const code = req.nextUrl.searchParams.get('code')
  const raw = req.nextUrl.searchParams.get('next') ?? '/feed'

  // Only same-origin paths. A leading "//" is a protocol-relative URL and
  // would send people to another site entirely.
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/feed'

  if (!code) return NextResponse.redirect(`${origin}/login?expired=1`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?expired=1`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login?expired=1`)

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('id', user.id).maybeSingle()

  if (!profile) {
    const to = new URL(`${origin}/claim-username`)
    if (next !== '/feed') to.searchParams.set('next', next)
    return NextResponse.redirect(to)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
