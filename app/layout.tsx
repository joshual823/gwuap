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
            <div className="top-icons">
              <Link href="/chat" className="icon-wrap">💬<span className="badge">2</span></Link>
              <Link href="/dm" className="icon-wrap">✉️<span className="badge">1</span></Link>
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
