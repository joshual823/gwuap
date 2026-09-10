/**
 * Animated reactions that need no key and no account.
 *
 * The GIF picker was built against Tenor, which turned out to be closed
 * to new clients, and then against GIPHY, whose signup 404s. Both of
 * those are somebody else's service being unavailable, and the lesson
 * from the second one is the same as the first: a feature that only
 * works once you've been granted a key is a feature that might never
 * work at all.
 *
 * So this is the version with no dependency to grant. Google's Noto
 * animated emoji are openly licensed and served from Google's own CDN,
 * so there is nothing to sign up for, nothing to store, no key to leak
 * and no copyright question — which is more than can be said for a
 * library of other people's GIFs.
 *
 * It is not a GIF library and shouldn't pretend to be. It's the set of
 * reactions people actually send about a game, which is most of what a
 * GIF gets used for in a group chat anyway. The GIPHY picker still works
 * if a key ever appears; this is what's there when it hasn't.
 *
 * Every codepoint below was checked against the CDN before being added —
 * plenty of emoji have no animated version, and a 404 in a picker is a
 * broken square nobody can explain.
 */

export type Sticker = { code: string; char: string; label: string }

/** WebP rather than GIF: same animation, about half the bytes. */
export const stickerUrl = (code: string) =>
  `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`

export const STICKERS: Sticker[] = [
  { code: '1f525', char: '🔥', label: 'Fire' },
  { code: '1f602', char: '😂', label: 'Crying laughing' },
  { code: '1f4a5', char: '💥', label: 'Boom' },
  { code: '1f440', char: '👀', label: 'Eyes' },
  { code: '1f92f', char: '🤯', label: 'Mind blown' },
  { code: '1f911', char: '🤑', label: 'Money face' },
  { code: '1f3af', char: '🎯', label: 'Bullseye' },
  { code: '1f4c8', char: '📈', label: 'Up' },
  { code: '1f4c9', char: '📉', label: 'Down' },
  { code: '1f44f', char: '👏', label: 'Clap' },
  { code: '1f64f', char: '🙏', label: 'Please' },
  { code: '1f480', char: '💀', label: 'Dead' },
  { code: '1f974', char: '🥴', label: 'Woozy' },
  { code: '1f60e', char: '😎', label: 'Cool' },
  { code: '1f622', char: '😢', label: 'Crying' },
  { code: '1f621', char: '😡', label: 'Furious' },
  { code: '1f620', char: '😠', label: 'Angry' },
  { code: '1f979', char: '🥹', label: 'Holding it together' },
  { code: '1fae0', char: '🫠', label: 'Melting' },
  { code: '1f971', char: '🥱', label: 'Bored' },
]

/** Matches what the CDN path will accept, so a typo fails here not there. */
export const isStickerUrl = (url: string) =>
  /^https:\/\/fonts\.gstatic\.com\/s\/e\/notoemoji\/latest\/[0-9a-f]{4,6}\/512\.webp$/.test(url)
