import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

export const metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: `Talk sports with the people who know it best. Post your picks, track your record, and back up your takes.`,
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
    <html lang="en">
      <body>
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
