import { renderNudge, nudgeDue, NUDGE_DAYS, MAX_NUDGES, type NudgeInput } from './nudge'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}
const input = (o: Partial<NudgeInput> = {}): NudgeInput => ({
  username: 'blocca', sent: 0, headlines: [], clips: [],
  gradedWhileAway: 0, inSquad: false, ...o,
})

console.log('the schedule: day 3, day 10, day 30, then it stops')
check('two days away is too soon', nudgeDue(2, 0), false)
check('three days, first email', nudgeDue(3, 0), true)
check('four days, still the first', nudgeDue(4, 0), true)
check('one sent, four days — not yet', nudgeDue(4, 1), false)
check('one sent, ten days', nudgeDue(10, 1), true)
check('two sent, twenty days — not yet', nudgeDue(20, 2), false)
check('two sent, thirty days', nudgeDue(30, 2), true)
// An account that ignored all three has answered.
check('three sent, a year away', nudgeDue(365, 3), false)
check('the schedule is three long', [NUDGE_DAYS.length, MAX_NUDGES], [3, 3])

console.log('\nthe subject leads with their own picks when there are any')
{
  const one = renderNudge(input({ gradedWhileAway: 1 }))
  check('singular', one.subject, '1 of your picks was settled while you were away')
  const many = renderNudge(input({ gradedWhileAway: 4 }))
  check('plural', many.subject, '4 of your picks were settled while you were away')
  check('and it says so in the body', many.html.includes('<strong>4</strong>'), true)
}

console.log('\notherwise it leads with a headline, not with "we miss you"')
{
  const d = renderNudge(input({ headlines: [{ title: 'Chiefs win in overtime', href: 'https://x/1' }] }))
  check('subject is the news', d.subject, 'Chiefs win in overtime')
  check('nothing about missing anyone', /miss|come back|haven.t seen/i.test(d.html), false)
}

console.log('\nnothing to say still produces a sentence, not a blank')
{
  const d = renderNudge(input())
  check('subject falls back', d.subject, "What's been happening on Gwuap")
  check('body is not empty', d.html.length > 400, true)
  check('text part is not empty', d.text.trim().length > 10, true)
}

console.log('\nwhat it suggests depends on whether they are in a squad')
{
  const out = renderNudge(input({ inSquad: false }))
  check('not in one: invited to start one', out.html.includes('Start one'), true)
  const inSquad = renderNudge(input({ inSquad: true }))
  check('already in one: not told to start one', inSquad.html.includes('Start one'), false)
  check('told what their table does instead', inSquad.html.includes("table updates itself"), true)
}

console.log('\ncontent is escaped — a headline is somebody else’s text')
{
  const d = renderNudge(input({
    headlines: [{ title: 'Chiefs <script>alert(1)</script> & Ravens', href: 'https://x/1?a=1&b=2' }],
  }))
  check('no raw script tag', d.html.includes('<script>'), false)
  check('escaped instead', d.html.includes('&lt;script&gt;'), true)
  check('ampersand in a title', d.html.includes('&amp; Ravens'), true)
  check('ampersand in a url', d.html.includes('a=1&amp;b=2'), true)
}

console.log('\nlinks survive into the plain-text part')
{
  const d = renderNudge(input({
    headlines: [{ title: 'One', href: 'https://x/1' }],
    clips: [{ title: 'Two', href: 'https://x/2' }],
  }))
  check('headline link', d.text.includes('https://x/1'), true)
  check('clip link', d.text.includes('https://x/2'), true)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
