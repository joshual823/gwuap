import { daysLeft, hasEnded, deadlineLabel, isClosingSoon, CONTEST } from './contest'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = got === want
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${got}${ok ? '' : ` (want ${want})`}`)
}

const at = (iso: string) => new Date(iso)

console.log('deadline wording changes only when the deadline is actually close')
check('two weeks out shows a date', deadlineLabel(at('2026-09-01T12:00:00Z')), `Ends ${CONTEST.endsLabel}`)
check('8 days out still a date',  deadlineLabel(at('2026-09-07T11:00:00Z')), `Ends ${CONTEST.endsLabel}`)
check('6 days out counts down',   deadlineLabel(at('2026-09-09T12:00:00Z')), '6 days left')
check('2 days out counts down',   deadlineLabel(at('2026-09-13T12:00:00Z')), '2 days left')
check('final day',                deadlineLabel(at('2026-09-14T13:00:00Z')), 'Ends today')
check('after the end',            deadlineLabel(at('2026-09-16T12:00:00Z')), 'Closed')

console.log('\nboundaries')
check('not ended a second before', hasEnded(at('2026-09-15T11:59:59Z')), false)
check('ended exactly on time',     hasEnded(at('2026-09-15T12:00:00Z')), true)
check('days never negative',       daysLeft(at('2027-01-01T00:00:00Z')), 0)
check('closing soon at 6 days',    isClosingSoon(at('2026-09-09T12:00:00Z')), true)
check('not closing soon at 12',    isClosingSoon(at('2026-09-03T12:00:00Z')), false)
check('not closing once closed',   isClosingSoon(at('2026-09-16T12:00:00Z')), false)

console.log('\nthe deadline is after Week 1 finishes')
// Monday night of Week 1 kicks off 14 Sept and ends late; the overnight
// grading run settles it before this cutoff.
check('open during Monday night', hasEnded(at('2026-09-15T03:00:00Z')), false)
check('open at 8am ET Tuesday',   hasEnded(at('2026-09-15T11:00:00Z')), false)
check('prize pool adds up',       CONTEST.payouts.reduce((a, b) => a + b, 0), CONTEST.prize)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
