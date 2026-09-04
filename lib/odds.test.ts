import { splitAmericanOdds, formatAmericanOdds, QUICK_ODDS } from './odds'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}

console.log('a book price survives the round trip into the form and back')
// This is the whole point: the link carries a price, the form splits it
// into a sign and digits, and the comparison that decides "is this still
// the book's number" has to see them as equal.
for (const price of ['+113', '-125', '+104', '-110', '+150', '-1200', '+10000']) {
  const parts = splitAmericanOdds(price)
  const rebuilt = parts ? `${parts.sign}${parts.digits}` : null
  check(`${price} round-trips`, rebuilt, formatAmericanOdds(price))
  check(`${price} equals itself`, rebuilt === price, true)
}

console.log('\nunsigned odds are read as favourites, the way the form does')
check('110 -> -110', formatAmericanOdds('110'), '-110')

console.log('\nrubbish is refused rather than guessed at')
for (const bad of ['', '  ', 'abc', '+', '-', '99', '+9', null, undefined, '1.5', '+12a']) {
  check(`${JSON.stringify(bad)} -> null`, formatAmericanOdds(bad as any), null)
}

console.log('\nquick-odds chips are all valid prices')
check('every chip parses', QUICK_ODDS.every(o => formatAmericanOdds(o) === o), true)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
