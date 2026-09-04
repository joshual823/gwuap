import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Without this the client is built with an undefined key and the
  // route answers a bare 500, which reads as "moderation is broken"
  // rather than "a variable is missing".
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  const { reportId, userId, postId, messageId, action } = await req.json()
  const admin = createAdminClient()

  if (action === 'ban' && userId) {
    await admin.from('profiles').update({ is_banned: true }).eq('id', userId)
  }
  if (action === 'remove_post' && postId) {
    await admin.from('posts').delete().eq('id', postId)
  }
  // A chat message can only be deleted by its author under RLS, which
  // left banning as the only lever on a single bad line — blunt, and it
  // takes every other message the person wrote with it. This runs on the
  // service key, so it bypasses that policy; the room sees the row
  // disappear over the same realtime subscription it always did.
  if (action === 'remove_message' && messageId) {
    await admin.from('game_messages').delete().eq('id', messageId)
  }
  await admin.from('reports').update({ status: action === 'dismiss' ? 'dismissed' : 'actioned' }).eq('id', reportId)

  return NextResponse.json({ ok: true })
}
