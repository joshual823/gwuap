import Link from 'next/link'

/**
 * What the site is, before the scores.
 *
 * A logged-out visitor used to meet a wall of point spreads — the first
 * seven hundred characters of the page were "LAR -3.5 o/u 48.5" and
 * nothing else — and had to infer the rest. That's the wrong first
 * impression twice over: a stranger from an ad can't tell what they've
 * landed on, and an ad reviewer scanning the page sees a sportsbook.
 * One of those costs signups and the other got an ad flagged.
 *
 * So it says the three things that are actually true and actually
 * distinguishing, in one line each, above everything else.
 *
 * It says them without "nothing to deposit" or "no money on the line",
 * which is a deliberate second pass over the first draft. Those are the
 * words the flagged campaign used, and a classifier scores them the same
 * whether they affirm or deny — so the denial was carrying the flag it
 * was written to remove. "We never ask for a card" says the same thing,
 * and says it better to a person too: it's concrete and checkable, where
 * "nothing to deposit" borrows the sportsbook's own vocabulary to claim
 * not to be one. The explicit denial stays, because a human reviewer is
 * the audience for that sentence and shouldn't have to infer it.
 */
export default function WhatThisIs() {
  return (
    <section className="what-is">
      <p className="what-is-lead">
        <strong>Post a pick, the final score settles it.</strong> Nobody grades
        their own, and nothing can be edited once a game starts.
      </p>
      <p className="what-is-sub">
        Free to join, and we never ask for a card. We&apos;re not a
        sportsbook and don&apos;t take bets.{' '}
        <Link href="/help" className="help-link">How it works</Link>
      </p>
    </section>
  )
}
