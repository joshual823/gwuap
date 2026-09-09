/**
 * A squad's address.
 *
 * The name is what people type; the slug is what lives in the URL and in
 * the unique index. Both the shape below and the check constraint in
 * migration 042 have to agree — if they drift, a perfectly reasonable
 * name gets rejected by Postgres with a message nobody can act on.
 * lib/squad.test.ts is what keeps them honest.
 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}$/

export function slugify(name: string): string {
  return name.toLowerCase().trim()
    // Fold accents to their base letter first. Without this "Ünïcödé"
    // loses its vowels outright and becomes "n-c-d", which is not a
    // name anybody would recognise as theirs.
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Anything that isn't a letter or a number becomes a hyphen, so
    // "Sunday Sweats 🏈" and "Sunday  Sweats!!" land on the same address.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 31)
    // A trim to 31 can leave a trailing hyphen, which the constraint
    // allows but reads as a typo in a URL.
    .replace(/-+$/, '')
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}
