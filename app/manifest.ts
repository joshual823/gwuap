import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

/**
 * What makes this installable to a home screen.
 *
 * Two people signed up from a Polymarket group on 11 Sep and went
 * straight back to the group chat, saying they'd rather use an app with
 * push notifications. That's the first specific, fixable reason anybody
 * has given for leaving — and push on iOS is only available to a site
 * that has been added to the home screen, which needs this file.
 *
 * `display: 'standalone'` is the part people actually notice: no address
 * bar, no browser chrome, its own entry in the app switcher. It stops
 * being a tab.
 *
 * Deliberately not an App Store build. A native wrapper would put this
 * in front of App Review, and the site has already been classified as
 * gambling by X's ad classifier and rejected under Reddit's gambling
 * policy this week. Apple's guideline 5.3 is a third gatekeeper with a
 * slower loop and a licensed-operator bar, and a home screen icon is
 * most of what an app gives this product anyway.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE,
    // The feed, not the marketing page: somebody who installed this has
    // already decided, and should land where the content is.
    start_url: '/feed',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Matches the dark theme's page background, so the splash screen and
    // the gap under the status bar don't flash white on launch.
    background_color: '#0B0E11',
    theme_color: '#0B0E11',
    categories: ['sports', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops to a circle or squircle; the maskable art keeps the
      // coin inside the safe zone so the edges don't get eaten.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
