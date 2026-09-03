import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabaseServer'
import { profitForStatus } from '@/lib/odds'

/**
 * Settle by hand a pick the scoreboard couldn't.
 *
 * The service role is used because migration 022 revoked update on posts
 * from everyone — that revoke is the thing making records trustworthy,
 * so it stays, and the exception lives here behind an is_admin check
 * instead.
 *
 * The important rule is the one below: an admin cannot grade their own
 * pick. There is one admin, they may well enter their own contest, and
 * "the person running it can mark their own picks" is the exact
 * accusation a cash prize invites. Refusing it in code means the answer
 * is verifiable rather than a promise.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { postId, status } = await req.json()
  if (!postId || !['win', 'loss', 'push', 'void'].includes(status)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('posts')
    .select('id, author_id, odds, stake, status')
    .eq('id', postId)
    .single()

  if (!post) return NextResponse.json({ error: 'No such pick' }, { status: 404 })

  if (post.author_id === user.id) {
    return NextResponse.json({
      error: 'You cannot grade your own pick, even as an admin. Ask another admin.',
    }, { status: 403 })
  }

  if (post.status !== 'pending') {
    return NextResponse.json({ error: 'That pick is already settled' }, { status: 409 })
  }

  const profit = profitForStatus(status, post.odds, post.stake)

  await admin
    .from('posts')
    .update({
      status,
      profit,
      graded_at: new Date().toISOString(),
      graded_by: 'admin',
      grade_note: null,
    })
    .eq('id', postId)
    .eq('status', 'pending')

  return NextResponse.json({ ok: true })
}
