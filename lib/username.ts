/**
 * What a username is allowed to be.
 *
 * This lived in three client components and nowhere else, which meant it
 * was advice rather than a rule — anything that didn't go through the
 * signup form was unchecked. `/api/login` then passed whatever arrived
 * straight into a Postgres `ilike`, where `%` and `_` are wildcards.
 *
 * That wasn't a login bypass — the password still had to be right — but
 * it defeated the thing that makes guessing expensive. The route
 * throttles ten attempts per username per fifteen minutes, keyed on the
 * string it was given, and `jbreezy823`, `jbreezy82%`, `jbreez%` and
 * `%reezy823` are four different strings that all resolve to the same
 * one account. Four keys, forty attempts, and no ceiling on how many
 * more patterns you can invent.
 *
 * So the shape is checked before the string reaches the database, and
 * the check lives here so there is one copy of it.
 */
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export function isValidUsername(value: unknown): value is string {
  return typeof value === 'string' && USERNAME_RE.test(value.trim())
}
