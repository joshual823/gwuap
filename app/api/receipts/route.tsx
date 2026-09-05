import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabaseServer'
import { SITE_NAME } from '@/lib/brand'
import { labelFor, type Direction } from '@/lib/odds'
import type { BetType } from '@/lib/odds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The day's settled picks, as one image.
 *
 * Made to be posted by hand on X rather than through the API. X charges
 * $0.20 for a post carrying a link and then downranks it for carrying
 * one, so the cheapest and best-performing thing to post is a picture —
 * and the picture that's worth posting here is the receipts, because
 * automatic grading is the only claim on this site that a competitor
 * can't simply assert.
 *
 * Losses are shown in red alongside the wins on purpose. Everyone on
 * sports social claims seventy percent; an account that publishes the
 * losses is the only one anybody believes.
 */
const HOURS = 36

type Row = {
  tag: string
  tag2: string | null
  bet_type: BetType
  sentiment: Direction
  line: number | null
  status: 'win' | 'loss' | 'push'
}

function describe(r: Row): string {
  const side = labelFor(r.sentiment, r.bet_type)
  if (r.line == null) return side
  // Only a spread is quoted with a sign. "Under F5 +4.5" reads as a
  // handicap, which is a different bet from the one that was made.
  const line = r.bet_type === 'spread' ? `${r.line > 0 ? '+' : ''}${r.line}` : `${r.line}`
  return `${side} ${line}`
}

export async function GET() {
  const supabase = await createClient()
  const since = new Date(Date.now() - HOURS * 3600_000).toISOString()

  const { data } = await supabase
    .from('posts')
    .select('tag, tag2, bet_type, sentiment, line, status')
    .in('status', ['win', 'loss', 'push'])
    .eq('post_kind', 'pick')
    .gte('graded_at', since)
    .order('graded_at', { ascending: false })
    .limit(6)

  const rows = (data ?? []) as Row[]
  const wins = rows.filter(r => r.status === 'win').length
  const losses = rows.filter(r => r.status === 'loss').length

  const tone = (s: Row['status']) =>
    s === 'win' ? '#00C805' : s === 'loss' ? '#F0424D' : '#8B98A5'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#0B0E11', color: '#ECEDEE', padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 76, height: 76, borderRadius: 999,
              background: 'radial-gradient(120% 100% at 50% -10%, #9BFFA6 0%, #35E24A 26%, #00C805 52%, #009B0A 76%, #04630C 100%)',
              color: '#053B08', fontSize: 50, fontWeight: 800,
            }}
          >
            G
          </div>
          <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, color: '#00C805', letterSpacing: -2 }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{
          display: 'flex', fontSize: 38, fontWeight: 700, letterSpacing: -1,
          margin: '30px 0 22px', flexShrink: 0,
        }}>
          Graded in the last {HOURS} hours
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          {rows.length === 0 && (
            <div style={{ display: 'flex', fontSize: 32, color: '#8B98A5' }}>
              Nothing settled yet today.
            </div>
          )}
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#12161B', border: '1px solid #22282F', borderRadius: 14,
                padding: '16px 22px', flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', fontSize: 31, fontWeight: 700 }}>
                  {r.tag}{r.tag2 ? `  vs  ${r.tag2}` : ''}
                </div>
                <div style={{ display: 'flex', fontSize: 22, color: '#8B98A5' }}>
                  {describe(r)}
                </div>
              </div>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: tone(r.status) }}>
                {r.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 24, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
            <span style={{ color: '#00C805' }}>{wins}</span>
            <span style={{ color: '#8B98A5', margin: '0 8px' }}>–</span>
            <span style={{ color: '#F0424D' }}>{losses}</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#8B98A5' }}>
            Settled by the final score · gwuap.co
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  )
}
