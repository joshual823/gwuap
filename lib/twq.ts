/**
 * X's conversion pixel, wrapped.
 *
 * Same shape as lib/rdt.ts and for the same reason: the pixel is
 * optional, so with no id set — locally, in previews, or before any ad
 * money is spent — nothing loads and every call here is a no-op. Calling
 * an absent global from a component would throw, and it would throw
 * inside signup.
 *
 * X differs from Reddit in one way that matters. Reddit takes a named
 * event (`track', 'SignUp'`); X takes an **event id** you generate in
 * Events Manager, which looks like `tw-o1abc-o1abd`. So there are two
 * variables to set, not one, and a pixel id alone reports page views and
 * no conversions — which is the failure that looks like the pixel is
 * working.
 */
type Twq = (...args: unknown[]) => void

function twq(): Twq | null {
  if (typeof window === 'undefined') return null
  const fn = (window as unknown as { twq?: Twq }).twq
  return typeof fn === 'function' ? fn : null
}

/**
 * A real account, counted once — at the moment a profile row exists,
 * not when the form was submitted. Between those two is an email
 * confirmation plenty of people never complete, and counting them would
 * have X optimising toward an audience that doesn't arrive.
 */
export function trackSignUp(): void {
  const event = process.env.NEXT_PUBLIC_X_SIGNUP_EVENT_ID
  if (!event) return
  twq()?.('event', event, {})
}

/**
 * Give a just-fired pixel long enough to actually leave the browser.
 *
 * `twq` queues the call and the tag sends it on its own schedule. A hard
 * navigation immediately afterwards — `window.location.href = ...` —
 * tears the page down first, and the request dies in the queue. The
 * event then never arrives and the site looks like it isn't firing at
 * all, which is indistinguishable from a broken pixel.
 *
 * A third of a second is not noticeable to somebody who has just pressed
 * a button that visibly does something, and it is the difference between
 * a counted signup and a lost one. Client-side navigations
 * (`router.push`) don't need it — the page isn't destroyed.
 */
export function flushPixels(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 350))
}
