/**
 * Rules that describe the site rather than a promotion.
 *
 * These lived in lib/contest.ts, which made a permanent property of the
 * leaderboard look like a term of a one-off prize. The prize is gone;
 * the rule isn't.
 */

/**
 * Graded picks needed before anyone appears on the leaderboard at all.
 *
 * The `leaderboard` view enforces this (`having count(*) ... >= 5`), so
 * this constant decides nothing — it exists so the number the page says
 * comes from one place instead of being typed into the copy twice.
 * Changing it changes what the site claims, not what it does: the view
 * is the rule, and a migration is what moves it.
 */
export const MIN_GRADED_PICKS = 5
