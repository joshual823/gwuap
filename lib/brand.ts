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
