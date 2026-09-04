import { distinctCodes } from './scores'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}
const p = (displayName: string) => ({ displayName })

console.log('different surnames are left alone')
check('Sabalenka v Swiatek',
  distinctCodes(p('Aryna Sabalenka'), p('Iga Swiatek'), 'SABALENKA', 'SWIATEK'),
  ['SABALENKA', 'SWIATEK'])

console.log('\nsame surname widens by a first initial')
check('Leylah v Bianca Fernandez',
  distinctCodes(p('Leylah Fernandez'), p('Bianca Fernandez'), 'FERNANDEZ', 'FERNANDEZ'),
  ['LFERNANDEZ', 'BFERNANDEZ'])

console.log('\nsame initial keeps widening — the case you asked about')
check('John v Jane Smith',
  distinctCodes(p('John Smith'), p('Jane Smith'), 'SMITH', 'SMITH'),
  ['JOSMITH', 'JASMITH'])
check('Jon v Jonathan Jones',
  distinctCodes(p('Jon Jones'), p('Jonathan Jones'), 'JONES', 'JONES'),
  ['JONJONES', 'JONAJONES'])

console.log('\nidentical names can\'t be told apart from a scoreboard')
check('two Marco Silvas',
  distinctCodes(p('Marco Silva'), p('Marco Silva'), 'SILVA', 'SILVA'),
  ['SILVA1', 'SILVA2'])

console.log('\nno first name to widen with')
check('mononyms',
  distinctCodes(p('Ronaldo'), p('Ronaldo'), 'RONALDO', 'RONALDO'),
  ['RONALDO1', 'RONALDO2'])

console.log('\nwhatever happens, the two codes differ')
const cases: [string, string][] = [
  ['Leylah Fernandez', 'Bianca Fernandez'], ['John Smith', 'Jane Smith'],
  ['Marco Silva', 'Marco Silva'], ['Ronaldo', 'Ronaldo'], ['A B', 'A C'],
]
check('never equal', cases.every(([x, y]) => {
  const last = (n: string) => n.split(' ').slice(-1)[0].toUpperCase()
  const [ca, cb] = distinctCodes(p(x), p(y), last(x), last(y))
  return ca !== cb
}), true)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
