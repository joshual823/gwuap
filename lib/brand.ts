/**
 * The site's name lives here so renaming is a one-line change rather
 * than a hunt through the codebase. Worth keeping that way — the
 * technical cost of a rename should stay near zero for as long as the
 * name is still up for debate.
 */
export const SITE_NAME = 'Gwuap'
export const SITE_TAGLINE = 'talk sports, post picks, keep the receipts'
export const SITE_URL = 'https://gwuap.co'

/**
 * Where support goes. Email rather than an in-app form on purpose: it
 * still works when the site doesn't, which is when people most need to
 * reach someone, and it lands somewhere already read every day.
 */
export const SUPPORT_EMAIL = 'hello@gwuap.co'

/**
 * Prefix for browser-stored preferences. Changing it silently resets
 * remembered league and stake for existing users — harmless, but it's
 * why this is separate from SITE_NAME rather than derived from it.
 */
export const STORAGE_PREFIX = 'gwuap'

/**
 * The Gwuap green, for everything that can't read a CSS variable —
 * email, the OG images, the receipts card.
 *
 * `app/globals.css` defines the same values as `--brand` and friends for
 * the site itself. Two copies is one more than anyone wants, but a
 * stylesheet can't be imported into an email and an inline style can't
 * read a custom property, so the copies are kept honest by
 * `lib/brand.test.ts`, which fails if these and the stylesheet disagree.
 *
 * BRAND_GREEN is the value for a dark surface. BRAND_GREEN_ON_LIGHT is
 * the same green darkened for white, where #00C805 measures 3.46:1 as
 * text and fails. Email is dark-only, so it uses the first.
 */
export const BRAND_GREEN = '#00C805'
export const BRAND_GREEN_ON_LIGHT = '#008319'

/** Text on a green fill — a button, a win stamp. Never white on #00C805. */
export const BRAND_INK = '#06210A'

/** The shadow end of the coin, and of every gradient that starts green. */
export const BRAND_DEEP = '#04630C'

/**
 * The coin, as gradient stops.
 *
 * One light source, top-left, which is why the stops run bright to deep
 * rather than being a flat fill. Duplicated as literals in
 * `app/icon.svg` and `public/logo.svg` because a static SVG can't import
 * anything; the test checks all four copies agree.
 */
export const COIN_STOPS = ['#9BFFA6', '#35E24A', BRAND_GREEN, '#009B0A', BRAND_DEEP] as const

/** The coin as one CSS/inline-style value, for the OG and receipt cards. */
export const COIN_GRADIENT =
  `radial-gradient(120% 100% at 50% -10%, ${COIN_STOPS[0]} 0%, ${COIN_STOPS[1]} 26%, ` +
  `${COIN_STOPS[2]} 52%, ${COIN_STOPS[3]} 76%, ${COIN_STOPS[4]} 100%)`
