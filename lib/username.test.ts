import { isValidUsername, USERNAME_RE } from './username'

/**
 * The shape check that stands between a login attempt and an `ilike`.
 * Every case below with a `%` or `_` in it was, before this existed, a
 * separate free allowance of ten password guesses against one account.
 */
let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

console.log('real usernames are accepted')
for (const u of ['jbreezy823', 'blocca', 'Bo_Knows', 'gwuap', 'abc', 'a'.repeat(20)]) {
  check(u, isValidUsername(u), true)
}

console.log('\n% is refused here — it is not a legal username character')
for (const u of ['jbreezy82%', '%', '%reezy823', 'jbreezy%23']) {
  check(u, isValidUsername(u), false)
}

// `_` is the awkward one: legal in a username *and* a single-character
// LIKE wildcard, so it cannot be rejected on shape without outlawing
// names like @Bo_Knows. It passes here on purpose. What stops it is the
// route insisting the row it found is the row that was asked for — see
// the exact-match check in app/api/login/route.ts.
console.log('\n_ is legal in a name, so the shape check must allow it')
for (const u of ['_breezy823', 'jbreezy8_3', 'Bo_Knows']) {
  check(`${u} passes shape`, isValidUsername(u), true)
}

console.log('\nand everything else that isn’t a username')
check('too short', isValidUsername('ab'), false)
check('too long', isValidUsername('a'.repeat(21)), false)
check('empty', isValidUsername(''), false)
check('spaces', isValidUsername('has space'), false)
check('hyphen', isValidUsername('bo-knows'), false)
check('quote', isValidUsername("bo'knows"), false)
check('null', isValidUsername(null), false)
check('number', isValidUsername(12345), false)
check('object', isValidUsername({}), false)
check('surrounding space is trimmed, not rejected', isValidUsername('  blocca  '), true)

console.log('\nthe regex is anchored — a wildcard cannot hide at either end')
check('no leading match', USERNAME_RE.test('%blocca'), false)
check('no trailing match', USERNAME_RE.test('blocca%'), false)
check('no newline smuggling', USERNAME_RE.test('blocca\n%'), false)

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
