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
}
module.exports = nextConfig
