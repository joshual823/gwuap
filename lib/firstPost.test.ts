import {
  renderFirstPost, firstPostDue, FIRST_POST_DAYS, MAX_FIRST_POST_NUDGES,
} from './firstPost'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('the schedule: day 3, then weekly, then it stops')
check('two days old is too soon', firstPostDue(2, 0), false)
check('three days, first email', firstPostDue(3, 0), true)
check('five days, still the first', firstPostDue(5, 0), true)
check('one sent, five days — not yet', firstPostDue(5, 1), false)
check('one sent, ten days', firstPostDue(10, 1), true)
check('two sent, sixteen days — not yet', firstPostDue(16, 2), false)
check('two sent, seventeen days', firstPostDue(17, 2), true)
check('three sent, twenty-four days', firstPostDue(24, 3), true)
// Four is the end of it, however long they leave it.
check('four sent, a year old', firstPostDue(365, 4), false)
check('the gaps are a week', [
  FIRST_POST_DAYS[1] - FIRST_POST_DAYS[0],
  FIRST_POST_DAYS[2] - FIRST_POST_DAYS[1],
  FIRST_POST_DAYS[3] - FIRST_POST_DAYS[2],
], [7, 7, 7])
check('the schedule is four long', [FIRST_POST_DAYS.length, MAX_FIRST_POST_NUDGES], [4, 4])

console.log('\nthe email')
const first = renderFirstPost({ username: 'blocca', sent: 0 })
check('subject names them', first.subject, 'Post your first take, @blocca')
check('leads with the take, which is the easy one', first.html.includes('<strong>take</strong>'), true)
check('points at the walkthrough, not the bare form',
  first.html.includes('/post/new?tour=1'), true)
check('the button says the same thing the welcome card did',
  first.html.includes('Show me how'), true)
check('plain text carries the link', first.text.includes('/post/new?tour=1'), true)

// A cashtag is a team in the league sports and an athlete in the
// individual ones — tennis codes are surnames — so copy that says only
// "team" is wrong for a whole category of post.
console.log('\nboth kinds work on a team or a player')
check('the first email says so in HTML',
  /player or\s+team/.test(renderFirstPost({ username: 'blocca', sent: 0 }).html), true)
check('and in plain text',
  renderFirstPost({ username: 'blocca', sent: 0 }).text.includes('player or team'), true)
check('the last one says it too',
  renderFirstPost({ username: 'blocca', sent: 3 }).text.includes('team or player'), true)
// The other half of the pair: a pick is about the result, not the side.
check('and says what a pick is',
  renderFirstPost({ username: 'blocca', sent: 0 }).text.includes('outcome of a game or match'), true)

console.log('\na different angle each time')
const subjects = [0, 1, 2, 3].map(sent => renderFirstPost({ username: 'blocca', sent }).subject)
check('four distinct subjects', new Set(subjects).size, 4)
check('the last one says it is the last', subjects[3], 'Last one from us, @blocca')
check('and the body says so too',
  renderFirstPost({ username: 'blocca', sent: 3 }).html.includes('last reminder'), true)

console.log('\nsafety')
// A username is constrained by profiles_username_shape (047), but the
// mailer escaping is the other half of that fix and shouldn't rely on it.
const nasty = renderFirstPost({ username: 'a<script>x</script>', sent: 0 })
check('the heading is escaped', nasty.html.includes('<script>'), false)
// Out of range rather than crashing: a counter past the end still renders.
check('a count past the end still renders',
  renderFirstPost({ username: 'blocca', sent: 99 }).subject, 'Last one from us, @blocca')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
