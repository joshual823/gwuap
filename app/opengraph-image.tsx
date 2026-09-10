import { ImageResponse } from 'next/og'
import { SITE_NAME, BRAND_GREEN, BRAND_INK, COIN_GRADIENT } from '@/lib/brand'

// Generated at build rather than kept as a binary, so the wording and
// the name can never drift from what the site actually says.
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
              background: COIN_GRADIENT,
              color: '#053B08', fontSize: 68, fontWeight: 800,
            }}
          >
            G
          </div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color: BRAND_GREEN, letterSpacing: -3 }}>
            {SITE_NAME}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 18, lineHeight: 1.25, letterSpacing: -1 }}>
          Post your picks. The final score grades them.
        </div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 26, color: '#8B98A5' }}>
          No self-reporting · No cropped screenshots · gwuap.co
        </div>
        {/* "Free to join" and not "no deposit, nothing at stake" — those
            are the exact words that got the first X campaign flagged as
            gambling content, and a classifier reads them the same whether
            they affirm or deny. This card is attached to the ad's link and
            to every share of gwuap.co, so it's ad copy whether or not we
            wrote it as ad copy. The landing page still says the longer
            version in prose, where a person has the context to read it
            right; an image stripped of context is where it looks worst. */}
        <div
          style={{
            display: 'flex', marginTop: 40, alignSelf: 'flex-start',
            background: BRAND_GREEN, color: BRAND_INK,
            fontSize: 28, fontWeight: 700,
            padding: '14px 26px', borderRadius: 999,
          }}
        >
          Free to join
        </div>
      </div>
    ),
    size,
  )
}
