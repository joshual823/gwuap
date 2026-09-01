import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

/**
 * Where Supabase sends someone after they click a password-reset link.
 * The link carries a one-time code that has to be exchanged for a session
 * before the new password can be set.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const code = req.nextUrl.searchParams.get('code')
  const next = req.nextUrl.searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?expired=1`)
}
