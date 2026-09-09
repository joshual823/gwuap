import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { SITE_NAME, SITE_URL } from '@/lib/brand'
import { isValidUsername } from '@/lib/username'

export const dynamic = 'force-dynamic'

/**
 * One person's week, as a card worth posting.
 *
 * The site-wide card at /receipts is marketing — it says the site grades
 * picks. This one says *you* were right, which is the only thing anybody
 * wants to post about themselves, and it's the whole reason this page
 * exists while the site is small: a member with nobody to talk to still
 * has a group chat somewhere else that's already arguing, and this is
 * what they take to it.
 *
 * Public, like the profile it's drawn from, so a card can be shared at
 * someone as easily as by them. No money on it either way.
 */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return {
    title: `@${username} — receipts`,
    robots: { index: false, follow: false },
  }
}

export default async function UserReceiptsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const asked = decodeURIComponent(username).replace(/^@/, '')
  if (!isValidUsername(asked)) notFound()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('username').ilike('username', asked).maybeSingle()
  // The lookup is an ilike and `_` is a wildcard, so confirm the row is
  // the one that was asked for — same reasoning as /api/login.
  if (!profile || profile.username.toLowerCase() !== asked.toLowerCase()) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = user
    ? await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
    : { data: null }
  const isMine = me?.username?.toLowerCase() === profile.username.toLowerCase()

  return (
    <div className="legal">
      <h1 className="page-title">
        {isMine ? 'Your receipts' : `@${profile.username}’s receipts`}
      </h1>
      <p className="legal-sub">
        Every pick the scoreboard settled for{' '}
        {isMine ? 'you' : `@${profile.username}`} this week — wins and losses
        both, graded automatically, never self-reported.
      </p>

      <img
        src={`/api/receipts?user=${encodeURIComponent(profile.username)}`}
        alt={`Picks graded for @${profile.username} this week`}
        style={{
          width: '100%', borderRadius: 14, border: '1px solid var(--line)',
          display: 'block', marginBottom: 18,
        }}
      />

      <h2>Saving it</h2>
      <p>
        Long-press the image on a phone, or right-click on a computer, and
        choose to save. It&apos;s 1080×1080 — square, which is what X,
        Instagram and a group chat all want.
      </p>

      <h2>Posting it</h2>
      <p>
        The losses are the point. Everyone in every group chat is undefeated
        until somebody keeps score, and a card with the misses on it is the
        only version anyone believes.
      </p>
      {isMine && (
        <p>
          Something like: <em>every one of these was posted before the game
          and graded off the final score. I didn&apos;t mark my own.</em>
        </p>
      )}
      <p>
        Post it as an image without a link in the post — X charges more for
        posts carrying one and then shows them to fewer people. Put{' '}
        {SITE_URL.replace('https://', '')} in a reply instead.
      </p>

      <p style={{ marginTop: 22 }}>
        <Link href={`/profile/${profile.username}`} className="help-link">
          ← Back to {isMine ? 'your profile' : `@${profile.username}`}
        </Link>
      </p>
      {!isMine && (
        <p className="legal-sub" style={{ marginTop: 18 }}>
          Yours works the same way — every pick on {SITE_NAME} is graded from
          the final score. <Link href="/signup" className="help-link">Sign up free</Link>.
        </p>
      )}
    </div>
  )
}
