import { readsAsBetting } from './news'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('somebody else’s betting preview is not news we carry')
// Both of these were live on the rail when an ad went to appeal.
for (const t of [
  'Florida A&M vs. Miami odds, picks, prediction, betting preview, start time for Week 2',
  'Miami vs. Florida A&M prediction, odds, time: 2026 Week 2 college football Thursday picks',
  'Best NFL bets for Sunday',
  'A parlay that actually hit',
  'Sportsbook promo codes for Week 2',
  'Moneyline movement ahead of kickoff',
  'The rise of legal gambling in college sports',
]) check(`✗ ${t.slice(0, 58)}`, readsAsBetting(t), true)

console.log('\nordinary sports news is kept')
for (const t of [
  'NFL Week 1 picks: Our experts face off on 49ers vs. Rams in Australia',
  '2026 MLB playoff picture: Standings, current bracket, postseason projections',
  'Analyzing Seahawks’ season-opening win over Patriots',
  'Ohtani heads to IL; Dodgers calling up top prospect De Paula',
  'What Will the 2026 Dolphins Passing Game Look Like?',
]) check(`✓ ${t.slice(0, 58)}`, readsAsBetting(t), false)

console.log('\n"picks" is this site’s own word and is never filtered on')
check('picks alone', readsAsBetting('Expert picks for the weekend'), false)
check('prediction alone', readsAsBetting('Bold predictions for Week 2'), false)

console.log('\nthe match is on word starts, so ordinary words survive')
// The bug this guards: a bare substring match kills "Betts", "Better",
// "Oddsmaker" is fine to drop but "Roberts" is not.
check('Mookie Betts', readsAsBetting('Mookie Betts homers twice for the Dodgers'), false)
check('a better team', readsAsBetting('The better team lost'), false)
check('Roberts', readsAsBetting('Dave Roberts on the bullpen'), false)
check('debut', readsAsBetting('A debut to remember'), false)

check('gambling still caught as a stem', readsAsBetting('The rise of legal gambling'), true)
check('gambler too', readsAsBetting('A gambler’s tale'), true)
check('handicapper', readsAsBetting('Our handicapper likes the under'), true)

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
