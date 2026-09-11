import { pushPayload, plain } from './push'
import type { Notif, Pick } from './digest'

let pass = 0, fail = 0
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` -> ${JSON.stringify(got)} (want ${JSON.stringify(want)})`}`)
  ok ? pass++ : fail++
}

const notif = (id: string, type: string, actor: string, post_id: string | null = null): Notif =>
  ({ id, user_id: 'u1', type, outcome: null, post_id, actor: { username: actor } })

console.log('\nHTML FROM THE EMAIL BECOMES TEXT FOR A TRAY')
check('tags stripped', plain('<b>won</b> the pick'), 'won the pick')
check('entities decoded', plain('Dave &amp; Sam'), 'Dave & Sam')
check('whitespace collapsed', plain('a\n\n  b'), 'a b')

console.log('\nONE PUSH PER RUN, NOT ONE PER EVENT')
const picks = new Map<string, Pick>()
check('nothing to say', pushPayload([], picks), null)

const one = pushPayload([notif('n1', 'comment', 'dave', 'p1')], picks)
check('single event names it', one?.body.includes('@dave'), true)
check('single event deep-links', one?.url, '/post/p1')
check('single event tagged by id', one?.tag, 'gwuap-n1')

const many = pushPayload(
  [notif('n1', 'comment', 'dave'), notif('n2', 'follow', 'sam'), notif('n3', 'follow', 'kim')], picks)
check('three events count the rest', many?.body.endsWith('and 2 more'), true)
check('three events name the newest', many?.body.includes('@kim'), true)
check('batch goes to the list', many?.url, '/notifications')
check('batch shares one tag', many?.tag, 'gwuap-batch')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
