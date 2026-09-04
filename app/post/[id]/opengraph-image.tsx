import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabaseServer'
import { SITE_NAME } from '@/lib/brand'
import { labelFor, formatSignedUsd, profitForStatus, type Direction, type PickStatus } from '@/lib/odds'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'A pick on Gwuap'

/**
 * The share card for one pick.
 *
 * A link that previews as the pick is a different thing from a link that
 * previews as the site — the first is worth sending to someone, the
 * second is an advert. The record is what makes this worth looking at,
 * so the result and the money lead.
 */
export default async function PostOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: p } = await supabase
    .from('posts')
    .select('tag, tag2, sentiment, post_kind, bet_type, line, odds, stake, profit, status, caption, author:profiles!posts_author_id_fkey ( username )')
    .eq('id', id)
    .maybeSingle()

  const post = p as any
  const username = post?.author?.username ? `@${post.author.username}` : SITE_NAME
  const status = (post?.status ?? 'pending') as PickStatus
  const settled = post?.profit ?? profitForStatus(status, post?.odds, post?.stake)

  const tone = status === 'win' ? '#00C805' : status === 'loss' ? '#F0424D' : '#8B98A5'
  const resultWord = status === 'pending' ? 'Open' : status.toUpperCase()

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '64px 76px',
        background: '#0B0E11', color: '#ECEDEE', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#8B98A5' }}>{username}</div>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, letterSpacing: -2, marginTop: 10 }}>
            {post?.tag ?? 'A pick'}
            {post?.tag2 ? <span style={{ color: '#5B6672', fontSize: 46, marginLeft: 18 }}>vs {post.tag2}</span> : null}
          </div>
          {post?.post_kind === 'pick' && (
            <div style={{ display: 'flex', fontSize: 34, marginTop: 14, color: '#8B98A5' }}>
              {labelFor((post?.sentiment ?? 'backing') as Direction, post?.bet_type)}
              {post?.line != null && post?.bet_type !== 'spread' ? ` ${post.line}` : ''}
              {post?.odds ? ` · ${post.odds}` : ''}
              {post?.stake != null ? ` · $${post.stake}` : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', background: tone, color: '#06210A',
              fontSize: 30, fontWeight: 700, padding: '12px 26px', borderRadius: 999,
            }}>{resultWord}</div>
            {settled != null && status !== 'pending' && (
              <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, marginLeft: 24, color: tone }}>
                {formatSignedUsd(settled)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#5B6672' }}>
            graded from the final score · gwuap.co
          </div>
        </div>
      </div>
    ),
    size,
  )
}
