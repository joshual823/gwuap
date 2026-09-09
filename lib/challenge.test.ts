import { opposingSide, resultOf, resultLabel, makeCode, type Side } from './challenge'
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('a moneyline swaps the teams')
{
  const mine: Side = { bet_type: 'moneyline', tag: '$SF', tag2: '$LAR', sentiment: 'backing', line: null }
  const theirs = opposingSide(mine)
  check('they get the other team', theirs.tag, '$LAR')
  check('and I am their opponent', theirs.tag2, '$SF')
  check('still backing, just someone else', theirs.sentiment, 'backing')
  check('no line on a moneyline', theirs.line, null)
}

console.log('\na spread swaps the teams AND flips the number')
{
  const mine: Side = { bet_type: 'spread', tag: '$SF', tag2: '$LAR', sentiment: 'backing', line: -3.5 }
  const theirs = opposingSide(mine)
  check('other team', theirs.tag, '$LAR')
  // The bug this guards: handing them "LAR -3.5" would be two people
  // betting the same way and calling it a head-to-head.
  check('number flips sign', theirs.line, 3.5)
  check('flipping twice returns the original', opposingSide(theirs), mine)
}
{
  const underdog: Side = { bet_type: 'spread', tag: '$LAR', tag2: '$SF', sentiment: 'backing', line: 7 }
  check('a positive line flips negative', opposingSide(underdog).line, -7)
  const pickem: Side = { bet_type: 'spread', tag: '$A', tag2: '$B', sentiment: 'backing', line: 0 }
  check('zero stays zero rather than becoming -0', Object.is(opposingSide(pickem).line, 0), true)
}

console.log('\na total keeps the teams and flips the direction')
{
  const over: Side = { bet_type: 'total', tag: '$SF', tag2: '$LAR', sentiment: 'over', line: 47.5 }
  const under = opposingSide(over)
  check('same fixture', [under.tag, under.tag2], ['$SF', '$LAR'])
  check('direction flips', under.sentiment, 'under')
  check('same number', under.line, 47.5)
  check('and back again', opposingSide(under), over)
}

console.log('\nnobody has won until both picks are graded')
check('both pending', resultOf('pending', 'pending'), 'pending')
check('one still pending', resultOf('win', 'pending'), 'pending')
check('the other still pending', resultOf('pending', 'loss'), 'pending')

console.log('\nresults')
check('challenger wins', resultOf('win', 'loss'), 'challenger')
check('opponent wins', resultOf('loss', 'win'), 'opponent')
check('both push', resultOf('push', 'push'), 'push')
check('a void kills it', resultOf('void', 'void'), 'void')
check('a void on one side kills it', resultOf('loss', 'void'), 'void')
// Two opposite picks can't both lose. Saying so beats inventing a winner.
check('both losing is reported, not resolved', resultOf('loss', 'loss'), 'unsettled')

console.log('\nthe result reads correctly from each side')
check('challenger, won', resultLabel('challenger', true), 'You won')
check('opponent, same result', resultLabel('challenger', false), 'You lost')
check('opponent won, from their side', resultLabel('opponent', false), 'You won')
check('pending reads the same to both', resultLabel('pending', true), resultLabel('pending', false))

console.log('\nthe code is typeable and matches what the database will accept')
{
  const sql = readFileSync(new URL('../supabase/migrations/043_challenges.sql', import.meta.url), 'utf8')
  const m = sql.match(/code text not null unique check \(code ~ '([^']+)'\)/)
  check('the constraint is in the migration', !!m, true)
  const re = new RegExp(m![1])
  let allValid = true, sawAmbiguous = false
  for (let i = 0; i < 400; i++) {
    const c = makeCode()
    if (!re.test(c)) allValid = false
    if (/[l1o0]/.test(c)) sawAmbiguous = true
  }
  check('400 codes all satisfy the constraint', allValid, true)
  check('none contain l, 1, o or 0', sawAmbiguous, false)
  check('length', makeCode().length, 8)
  check('deterministic with a fixed source', makeCode(() => 0), 'aaaaaaaa')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
