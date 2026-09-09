import { humanDuration, timeAgo } from './time'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('minutes, while minutes are still readable')
check('0', humanDuration(0), 'less than a minute')
check('1', humanDuration(1), '1 minute')
check('42', humanDuration(42), '42 minutes')
check('59', humanDuration(59), '59 minutes')

console.log('\nthen hours — the case that started this')
// The real message was "this game started 202 minutes ago".
check('202 minutes', humanDuration(202), '3 hours 22 minutes')
check('60', humanDuration(60), '1 hour')
check('61', humanDuration(61), '1 hour 1 minute')
check('90', humanDuration(90), '1 hour 30 minutes')

console.log('\npast six hours the minutes stop earning their place')
check('370', humanDuration(370), '6 hours')
check('400', humanDuration(400), '6 hours')
check('23h', humanDuration(23 * 60), '23 hours')

console.log('\nthen days, weeks, months')
check('24h', humanDuration(24 * 60), '1 day')
check('3 days', humanDuration(3 * 24 * 60), '3 days')
check('a week', humanDuration(7 * 24 * 60), '1 week')
check('3 weeks', humanDuration(21 * 24 * 60), '3 weeks')
check('3 months', humanDuration(95 * 24 * 60), '3 months')

console.log('\nnothing throws on rubbish input')
check('negative', humanDuration(-5), 'less than a minute')
check('fractional', humanDuration(1.9), '1 minute')
check('NaN', humanDuration(NaN), 'less than a minute')
check('Infinity', humanDuration(Infinity), 'less than a minute')

console.log('\ntimeAgo stays compact — it lives in the corner of a card')
{
  const ago = (mins: number) => timeAgo(new Date(Date.now() - mins * 60_000).toISOString())
  check('12m', ago(12), '12m')
  check('5h', ago(5 * 60), '5h')
  check('3d', ago(3 * 24 * 60), '3d')
  check('under a minute', ago(0), 'now')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
