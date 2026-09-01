import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'

export const metadata = {
  title: 'Gwuap — track your picks, follow the sharps',
  description: 'A social feed for sports bettors: post your picks, track your record, follow the sharps.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profileHref = '/login'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile) profileHref = `/profile/${profile.username}`
  }

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/feed" className="wordmark">Gwuap</Link>
            {/* Chat and DMs aren't built yet (Sessions 9-10). The links
                used to point at /chat and /dm, which 404, and carried
                hardcoded "2" and "1" notification badges. Both are gone
                until the features are real. */}
            <div className="top-icons">
              <Link href="/search" className="icon-wrap">🔍</Link>
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
        <nav className="tabbar">
          <Link href="/feed" className="tab-icon active">⌂</Link>
          <Link href="/search" className="tab-icon">🔍</Link>
          <Link href="/post/new" className="tab-post">+</Link>
          <Link href="/leaderboard" className="tab-icon">🏆</Link>
          <Link href={profileHref} className="tab-icon">👤</Link>
        </nav>
      </body>
    </html>
  )
}
