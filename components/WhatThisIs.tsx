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
 */
export default function WhatThisIs() {
  return (
    <section className="what-is">
      <p className="what-is-lead">
        <strong>Post a pick, the final score settles it.</strong> Nobody grades
        their own, and nothing can be edited once a game starts.
      </p>
      <p className="what-is-sub">
        Free — there&apos;s nothing to deposit and no money on the line.
        We&apos;re not a sportsbook and don&apos;t take bets.{' '}
        <Link href="/help" className="help-link">How it works</Link>
      </p>
    </section>
  )
}
