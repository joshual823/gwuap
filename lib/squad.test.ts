import { slugify, isValidSlug, SLUG_RE } from './squad'
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('names become addresses')
check('plain', slugify('Sunday Sweats'), 'sunday-sweats')
check('case', slugify('THE GROUP'), 'the-group')
check('punctuation', slugify('Sunday  Sweats!!'), 'sunday-sweats')
check('emoji', slugify('Sunday Sweats 🏈'), 'sunday-sweats')
check('leading and trailing junk', slugify('  --Hello--  '), 'hello')
check('numbers survive', slugify('Week 1 Crew'), 'week-1-crew')
check('accents fold to their base letter', slugify('Ünïcödé Crew'), 'unicode-crew')
check('and are not simply dropped', slugify('Café Crew'), 'cafe-crew')
check('a long name is trimmed without a trailing hyphen',
  slugify('a'.repeat(28) + ' bbbb').endsWith('-'), false)

console.log('\nand every address the function produces is one the database accepts')
for (const name of [
  'Sunday Sweats', 'THE GROUP', 'Week 1 Crew', 'a'.repeat(60),
  'x y', '99 problems', 'Ünïcödé Crew', 'a'.repeat(28) + ' bbbb',
]) {
  const s = slugify(name)
  check(`"${name.slice(0, 22)}" -> "${s}"`, isValidSlug(s), true)
}

console.log('\nnames that cannot make an address are rejected, not mangled')
for (const name of ['', '   ', '!!!', '🏈', 'a']) {
  check(`"${name}" is refused`, isValidSlug(slugify(name)), false)
}

console.log('\nthe regex here matches the check constraint in migration 042')
{
  const sql = readFileSync(new URL('../supabase/migrations/042_squads.sql', import.meta.url), 'utf8')
  const m = sql.match(/slug\s+text\s+not\s+null\s+unique\s+check\s*\(slug\s*~\s*'([^']+)'\)/)
  check('the constraint is found in the migration', !!m, true)
  check('and is the same pattern', m?.[1], SLUG_RE.source)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
