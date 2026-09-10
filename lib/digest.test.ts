import { readFileSync } from 'node:fs'
import { renderDigest, line, type Notif, type Pick } from './digest'

/**
 * The digest is the only thing on the site nobody can see before it's
 * sent. Everything else you can open in a browser; an email you find out
 * about from the person who received it. So it's tested here instead.
 */

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

const notif = (over: Partial<Notif> = {}): Notif => ({
  id: 'n1', user_id: 'u1', type: 'graded', outcome: 'win',
  post_id: 'p1', actor: null, ...over,
})
const pick = (over: Partial<Pick> = {}): Pick => ({
  id: 'p1', tag: '$LAD', tag2: '$CIN', sentiment: 'backing',
  bet_type: 'moneyline', line: null, ...over,
})
const picks = (...ps: Pick[]) => new Map(ps.map(p => [p.id, p]))

console.log('one graded pick — the subject names it')
{
  const d = renderDigest([notif()], picks(pick()))
  check('subject carries the cashtags', d.subject, 'Your pick won — $LAD vs $CIN')
  check('button points at the pick, not the list', d.href, 'https://gwuap.co/post/p1')
  check('button says so', d.html.includes('See the pick'), true)
  // The subject already said "your pick won"; saying it again underneath
  // is a stutter, so the row carries what the subject left out.
  check('body does not repeat the verdict', d.html.includes('Your pick <b>won</b>'), false)
  check('body carries the direction', d.html.includes('$LAD vs $CIN · Backing'), true)
  check('text has the link once', d.text.split('https://gwuap.co/post/p1').length - 1, 1)
}

console.log('\na loss, and a pick with a number on it')
{
  const d = renderDigest([notif({ outcome: 'loss' })], picks(pick()))
  check('a loss is not announced as a win', d.subject, 'Your pick was graded — $LAD vs $CIN')
  const spread = renderDigest(
    [notif()], picks(pick({ bet_type: 'spread', line: 1.5 })))
  check('the line is shown', spread.html.includes('Backing 1.5'), true)
}

console.log('\nseveral at once — every row says which pick and links to it')
{
  const items = [
    notif({ id: 'n1', post_id: 'p1' }),
    notif({ id: 'n2', post_id: 'p2', outcome: 'loss' }),
  ]
  const d = renderDigest(items, picks(pick(), pick({ id: 'p2', tag: '$STL', tag2: '$SF' })))
  check('subject counts them', d.subject, '2 of your picks were graded')
  check('button falls back to the list', d.href, 'https://gwuap.co/notifications')
  check('each row keeps its verdict', d.html.includes('Your pick <b>won</b>'), true)
  check('and the losing one too', d.html.includes('Your pick <b>lost</b>'), true)
  check('both rows link out', d.html.includes('/post/p1') && d.html.includes('/post/p2'), true)
  check('text carries both links', d.text.includes('/post/p1') && d.text.includes('/post/p2'), true)
}

console.log('\nthe digest stops spelling them out after eight')
{
  const items = Array.from({ length: 11 }, (_, i) => notif({ id: `n${i}`, post_id: `p${i}` }))
  const d = renderDigest(items, new Map())
  check('counts the remainder', d.html.includes('…and 3 more.'), true)
  check('only eight rows are drawn', d.html.split('margin:6px 0').length - 1, 9) // 8 rows + the "more" line
}

console.log('\nmissing data never produces a broken sentence')
{
  const d = renderDigest([notif({ post_id: null })], new Map())
  check('no pick, no dangling separator', d.html.includes('Your pick <b>won</b>.'), true)
  check('no link when there is no post', d.html.includes('<a href="https://gwuap.co/post/'), false)
  check('falls back to the notifications list', d.href, 'https://gwuap.co/notifications')
  const unknown = renderDigest([notif({ type: 'wat', post_id: null })], new Map())
  check('an unknown type still reads as English', unknown.html.includes('Someone did something.'), true)
}

console.log('\nthe other notification types still read correctly')
{
  const actor = { username: 'blocca' }
  check('reaction', line(notif({ type: 'reaction', actor })), '@blocca reacted to your post.')
  check('follow', line(notif({ type: 'follow', actor })), '@blocca followed you.')
  check('dm request', line(notif({ type: 'dm_request', actor })), '@blocca wants to message you.')
  check('no actor is not "@undefined"', line(notif({ type: 'follow', actor: null })), 'Someone followed you.')
}

console.log('\nevery notification type the database allows has a sentence')
{
  // The check constraint is the list of types that can exist. If one of
  // them has no case in line(), somebody gets an email reading "Someone
  // did something", which is worse than sending nothing. This has come
  // close twice: 026 and 039 both rewrote that constraint from memory.
  const sql = readFileSync(new URL('../supabase/migrations/044_squad_invites.sql', import.meta.url), 'utf8')
  const block = sql.slice(sql.indexOf('add constraint notifications_type_check'))
  const types = [...block.slice(0, block.indexOf('));')).matchAll(/'([a-z_]+)'/g)].map(m => m[1])
  check('the constraint lists every type', types.length, 9)
  for (const t of types) {
    const sentence = line(notif({ type: t, actor: { username: 'x' }, post_id: null }))
    check(`${t} reads as English`, sentence.includes('did something'), false)
  }
}

console.log('\nwhat came out of the database is escaped on the way into HTML')
{
  // Usernames had no format constraint in the database until 047, and an
  // email is built by joining strings rather than rendered by React.
  const nasty = renderDigest(
    [notif({ type: 'follow', post_id: null, actor: { username: '<script>x</script>' } })],
    new Map(),
  )
  check('no raw tag in the body', nasty.html.includes('<script>'), false)
  check('escaped instead', nasty.html.includes('&lt;script&gt;'), true)
  const tagged = renderDigest(
    [notif()], picks(pick({ tag: '$<b>A' })),
  )
  check('a pick summary is escaped too', tagged.html.includes('$<b>A'), false)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
