import Link from 'next/link'

/**
 * Sits inside the feed rather than replacing it. A logged-out visitor
 * should see the actual site — games, picks, trending — with an invitation
 * next to it, not a pitch page with nothing behind it.
 */
export default function JoinCard() {
  return (
    <div className="join-card">
      <div className="join-avatars" aria-hidden="true">
        <span className="join-av a" />
        <span className="join-av b" />
        <span className="join-av c" />
      </div>
      <strong>Join the conversation</strong>
      <p>
        Post your takes, call your picks, and see who's actually right —
        with a record that keeps itself.
      </p>
      <div className="join-actions">
        <Link href="/login" className="btn secondary">Log in</Link>
        <Link href="/signup" className="btn">Sign up</Link>
      </div>
    </div>
  )
}
