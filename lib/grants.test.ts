import { readFileSync, readdirSync } from 'node:fs'

/**
 * Does the edit form write any column the database won't let it write?
 *
 * This is the check that would have caught 039. That migration added
 * `email_notifications`, the form started sending it, and the
 * column-level UPDATE grant was never widened — so every profile save
 * failed with "permission denied for table profiles" for three days.
 * Not just the email setting: a Postgres UPDATE naming one forbidden
 * column fails whole, and the form sends every field every time.
 *
 * It reads the grant out of the migrations rather than out of the live
 * database, so it can't tell you whether the migration has actually been
 * run — only that the code and the SQL in this repo agree. Running it is
 * still on you.
 */

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

const root = new URL('..', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

/** Every `grant update (...) on profiles`, oldest first. The last wins. */
function grantedColumns(): string[] {
  const files = [
    'supabase/schema.sql',
    ...readdirSync(new URL('supabase/migrations', root))
      .filter(f => f.endsWith('.sql')).sort()
      .map(f => `supabase/migrations/${f}`),
  ]
  let latest: string[] = []
  for (const f of files) {
    const sql = read(f)
    // Skip commented-out lines: these files explain themselves at length.
    const live = sql.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    const re = /grant\s+update\s*\(([^)]*)\)\s*(?:\n\s*)?on\s+(?:public\.)?profiles/gi
    for (const m of live.matchAll(re)) {
      latest = m[1].split(',').map(c => c.trim()).filter(Boolean)
    }
  }
  return latest
}

/** The top-level keys of the `.update({ ... })` in the edit form. */
function writtenColumns(): string[] {
  const src = read('app/profile/[username]/EditProfile.tsx')
  const start = src.indexOf('.update({')
  if (start < 0) throw new Error('no .update({ in EditProfile — has it been rewritten?')
  const body = src.slice(start + '.update({'.length)
  const end = body.indexOf('\n      })')
  const block = body.slice(0, end < 0 ? undefined : end)
  return [...block.matchAll(/^\s{8}(\w+):/gm)].map(m => m[1])
}

const granted = grantedColumns()
const written = writtenColumns()

console.log('the grant is found and is column-level, not table-wide')
check('some columns are granted', granted.length > 0, true)
check('privilege columns are never granted',
  granted.filter(c => ['is_admin', 'is_banned', 'badges', 'welcomed_at', 'id'].includes(c)), [])

console.log('\nthe edit form only writes columns it is allowed to write')
check('form writes something', written.length > 0, true)
for (const col of written) {
  check(`${col} is granted`, granted.includes(col), true)
}

/**
 * A column-level REVOKE cannot subtract from a table-level GRANT.
 *
 * 040, 047 and 055 each wrote `revoke select (col) on profiles from
 * anon`, each ran without error, and none of them did anything —
 * `grant select on profiles to anon` was still in force and covers every
 * column, including ones added afterwards. It was only caught by reading
 * a supposedly-private column back with the public anon key.
 *
 * So: a narrow revoke is only meaningful if the broad grant it is trying
 * to carve into has been dropped first, somewhere in the migration
 * history. This checks the SQL says something true, not that the
 * database agrees — running it is still on you.
 */
function anonSelectIsRestricted(): { revokesColumns: boolean; revokesTable: boolean } {
  const files = [
    'supabase/schema.sql',
    ...readdirSync(new URL('supabase/migrations', root))
      .filter(f => f.endsWith('.sql')).sort()
      .map(f => `supabase/migrations/${f}`),
  ]
  let revokesColumns = false, revokesTable = false
  for (const f of files) {
    const live = read(f).split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    if (/revoke\s+select\s*\([^)]*\)\s*(?:\n\s*)?on\s+(?:public\.)?profiles\s+from\s+anon/gi.test(live)) {
      revokesColumns = true
    }
    if (/revoke\s+select\s+on\s+(?:public\.)?profiles\s+from\s+anon/gi.test(live)) {
      revokesTable = true
    }
  }
  return { revokesColumns, revokesTable }
}

console.log('\nanon cannot read what it is not meant to read')
const anon = anonSelectIsRestricted()
check('the table-level grant to anon has been dropped', anon.revokesTable, true)
if (anon.revokesColumns) {
  // Not a failure by itself — 040/047/055 are history and stay as
  // written — but it is only harmless because 056 dropped the table
  // grant. Without that they are decoration.
  check('…which is what makes the older column revokes mean anything', anon.revokesTable, true)
}

console.log('\ngranted:', granted.join(', '))
console.log('written:', written.join(', '))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
