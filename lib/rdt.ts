/**
 * Reddit's conversion pixel, wrapped.
 *
 * Every call goes through here rather than touching window.rdt directly,
 * because the pixel is optional: with no NEXT_PUBLIC_REDDIT_PIXEL_ID set
 * — locally, in previews, or before any ad money is spent — nothing
 * loads and every one of these is a no-op. Calling an absent global from
 * a component would throw instead, and it would throw inside signup, of
 * all places.
 */
type Rdt = (...args: unknown[]) => void

function rdt(): Rdt | null {
  if (typeof window === 'undefined') return null
  const fn = (window as unknown as { rdt?: Rdt }).rdt
  return typeof fn === 'function' ? fn : null
}

export function trackPageVisit(): void {
  rdt()?.('track', 'PageVisit')
}

/**
 * A real account, counted once — at the moment a profile row exists,
 * not when the signup form was submitted. Between those two is an email
 * confirmation that plenty of people never complete, and counting them
 * as signups would have Reddit optimising toward an audience that
 * doesn't arrive.
 */
export function trackSignUp(): void {
  rdt()?.('track', 'SignUp')
}
