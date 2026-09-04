import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/brand'
import { Analytics } from '@vercel/analytics/next'
import Clarity from '@/components/Clarity'

// Self-hosted at build time. The old CSS @import made the browser fetch
// our stylesheet, then Google's stylesheet, then the font files — a
// serial waterfall that left every page rendering in the system fallback
// for the first few hundred milliseconds.
//
// One family for everything, which is what Polymarket actually does —
// their markup references Inter and nothing else, no display face and no
// monospace. The calm comes from using a single well-made grotesque at
// different weights rather than from pairing faces.
const inter = Inter({
  subsets: ['latin'], display: 'swap', variable: '--font-body',
  weight: ['400', '500', '600', '700', '800'],
})

// The display and mono tokens stay in the stylesheet so components don't
// have to change and the whole site can be re-themed from one place. They
// just point at the body face now. Inline so they land on the same element
// next/font defines --font-body on, where they're guaranteed to resolve.
const fontTokens = {
  '--font-display': 'var(--font-body)',
  '--font-mono': 'var(--font-body)',
} as React.CSSProperties

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0E11' },
    { media: '(prefers-color-scheme: light)', color: '#F4F6F8' },
  ],
}

// metadataBase is what makes the generated opengraph-image resolve to an
// absolute URL. Without it the tag ships a relative path, and every
// messaging app drops the image silently — the link still previews, just
// with no picture, which is easy to miss and the whole point of this.
const SHARE_DESCRIPTION =
  'Post your picks and the final score grades them — no self-reporting, no cropped screenshots. Talk sports with people who keep the receipts.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SHARE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SHARE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SHARE_DESCRIPTION,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profileHref = '/login'
  let isAdmin = false
  let unread = 0
  let inbox = 0
  if (user) {
    const [{ data: profile }, { count }, { count: unreadMsgs }, { count: requests }] = await Promise.all([
      supabase.from('profiles').select('username, is_admin').eq('id', user.id).single(),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
      // RLS scopes both of these to conversations you're part of.
      supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', user.id),
      supabase.from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .neq('requested_by', user.id),
    ])
    if (profile) {
      profileHref = `/profile/${profile.username}`
      isAdmin = !!profile.is_admin
    }
    unread = count ?? 0
    inbox = (unreadMsgs ?? 0) + (requests ?? 0)
  }

  return (
    <html lang="en" className={inter.variable} style={fontTokens}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('gwuap:theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <div className="app">
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/feed" className="wordmark">{SITE_NAME}</Link>
            {/* Chat and DMs aren't built yet (Sessions 9-10). The links
                used to point at /chat and /dm, which 404, and carried
                hardcoded "2" and "1" notification badges. Both are gone
                until the features are real. */}
            <div className="top-icons">
              {/* /admin has no link otherwise — it was URL-only. */}
              {isAdmin && <Link href="/admin" className="icon-wrap" title="Moderation queue">🛡️</Link>}
              {user && (
                <Link href="/notifications" className="icon-wrap" title="Notifications">
                  🔔{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
                </Link>
              )}
              {user && (
                <Link href="/vent" className="icon-wrap" title="Vent room">🫂</Link>
              )}
              {user && (
                <Link href="/messages" className="icon-wrap" title="Messages">
                  ✉️{inbox > 0 && <span className="badge">{inbox > 9 ? '9+' : inbox}</span>}
                </Link>
              )}
              <Link href="/search" className="icon-wrap">🔍</Link>
            </div>
          </div>
        </header>
        <main className="scroll">
          <div className="container">{children}</div>
        </main>
        {/* Icon plus label: testers said they were guessing what the
            icons meant. A word under each removes the guessing. */}
        <nav className="tabbar">
          <Link href="/feed" className="tab active">
            <span className="tab-icon">⌂</span><span className="tab-label">Home</span>
          </Link>
          <Link href="/watchlist" className="tab">
            <span className="tab-icon">⭐</span><span className="tab-label">Watch</span>
          </Link>
          <Link href="/post/new" className="tab tab-center">
            <span className="tab-post">+</span><span className="tab-label">Post</span>
          </Link>
          <Link href="/leaderboard" className="tab">
            <span className="tab-icon">🏆</span><span className="tab-label">Ranks</span>
          </Link>
          <Link href={profileHref} className="tab">
            <span className="tab-icon">👤</span><span className="tab-label">Profile</span>
          </Link>
        </nav>
        </div>
        <Analytics />
        <Clarity />
      </body>
    </html>
  )
}
