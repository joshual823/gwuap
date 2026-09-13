/** @type {import('next').NextConfig} */

/**
 * Response headers the site had none of.
 *
 * Deliberately the set that can't break anything. A full
 * Content-Security-Policy restricting script sources is the one worth
 * having and the one that needs testing against Clarity, the Reddit
 * pixel, Vercel Analytics, Supabase realtime and Google Fonts — get it
 * wrong and the site half-works in a way that looks like a different
 * bug. `frame-ancestors` is the exception: it restricts who may embed
 * the page and nothing about what the page may load, so it's safe to
 * ship on its own.
 *
 * Why framing matters here specifically: someone who can put gwuap.co in
 * an invisible iframe can put a page of their own over it and take
 * clicks the visitor meant for us — and every destructive control on
 * this site (delete a post, ban, moderate) is one click behind a
 * session that stays signed in.
 */
const securityHeaders = [
  // Nobody may frame this site. Two headers because the older one is
  // what actually stops IE/legacy proxies, and CSP is what modern
  // browsers read.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },

  // A stored file served from Supabase claiming to be an image stays an
  // image, rather than being sniffed into something executable.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Don't leak the full URL of the page someone came from — post and
  // profile paths carry ids we've no reason to hand to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // The site asks for none of these; saying so stops an injected script
  // from asking on its behalf.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
]

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },

  /**
   * PostHog through our own domain.
   *
   * The browser talked to `us.i.posthog.com` directly, which every ad
   * blocker blocks by hostname. A blocked request doesn't error — the
   * session simply never records — so the data looked fine and was
   * quietly missing whoever runs a blocker. That is the exact failure
   * that cost nine days on Clarity: a script that loads with a 200 and
   * never sends.
   *
   * It matters more than usual right now because the decision in front
   * of us — is the landing page the problem, or is paid cold traffic the
   * wrong instrument — rests on watching session replays of Reddit
   * visitors. A sample skewed towards people who don't block trackers,
   * drawn from a tech-leaning sports audience, would answer a different
   * question than the one being asked. Bad data is worse than none,
   * because it still gets believed.
   *
   * Worth saying plainly: this routes around a choice the visitor made.
   * It's first-party product analytics rather than ad targeting, and
   * what gets collected is unchanged — /vent, /messages and /reset are
   * still excluded outright and every input is still masked, which is
   * the part that actually protects anyone. But it is a deliberate step,
   * not a free one.
   *
   * Two hosts, because PostHog serves them separately: the static
   * assets (array/*, static/*) and the ingestion endpoint.
   */
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  // The rewrites above proxy to a different origin, and without this
  // Next appends a trailing slash on the way out, which PostHog's
  // ingestion endpoint rejects.
  skipTrailingSlashRedirect: true,
}
module.exports = nextConfig
