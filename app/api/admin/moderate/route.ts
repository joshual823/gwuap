import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reportId, userId, postId, action } = await req.json()
  const admin = createAdminClient()

  if (action === 'ban' && userId) {
    await admin.from('profiles').update({ is_banned: true }).eq('id', userId)
  }
  if (action === 'remove_post' && postId) {
    await admin.from('posts').delete().eq('id', postId)
  }
  await admin.from('reports').update({ status: action === 'dismiss' ? 'dismissed' : 'actioned' }).eq('id', reportId)

  return NextResponse.json({ ok: true })
}
