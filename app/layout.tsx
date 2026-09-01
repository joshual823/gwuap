import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'

export const metadata = {
  title: 'Gwuap — track your picks, follow the sharps',
  description: 'A social feed for sports bettors: post your picks, track your record, follow the sharps.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profileHref = '/login'
  let isAdmin = false
  let unread = 0
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('username, is_admin').eq('id', user.id).single(),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ])
    if (profile) {
      profileHref = `/profile/${profile.username}`
      isAdmin = !!profile.is_admin
    }
    unread = count ?? 0
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
              {/* /admin has no link otherwise — it was URL-only. */}
              {isAdmin && <Link href="/admin" className="icon-wrap" title="Moderation queue">🛡️</Link>}
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
