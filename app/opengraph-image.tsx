import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/brand'
import { CONTEST } from '@/lib/contest'

// Generated at build rather than kept as a binary, so the prize and the
// name can never drift from what the site actually says.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE_NAME} — every pick graded from the final score`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 84px',
          background: '#0B0E11', color: '#ECEDEE',
          fontFamily: 'sans-serif',
        }}
      >
        {/* The same coin as the tab icon and the account picture, so a
            shared link is recognisable as the place people arrive at. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 104, height: 104, borderRadius: 999,
              background: 'radial-gradient(120% 100% at 50% -10%, #9BFFA6 0%, #35E24A 26%, #00C805 52%, #009B0A 76%, #04630C 100%)',
              color: '#053B08', fontSize: 68, fontWeight: 800,
            }}
          >
            G
          </div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color: '#00C805', letterSpacing: -3 }}>
            {SITE_NAME}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 18, lineHeight: 1.25, letterSpacing: -1 }}>
          Post your picks. The final score grades them.
        </div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 26, color: '#8B98A5' }}>
          No self-reporting · No cropped screenshots · gwuap.co
        </div>
        <div
          style={{
            display: 'flex', marginTop: 40, alignSelf: 'flex-start',
            background: '#00C805', color: '#06210A',
            fontSize: 28, fontWeight: 700,
            padding: '14px 26px', borderRadius: 999,
          }}
        >
          ${CONTEST.prize.toLocaleString()} for the best records by {CONTEST.endsLabel}
        </div>
      </div>
    ),
    size,
  )
}
