import { arrangeFeed } from './feed'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

const p = (id: string) => ({ id, author: { is_bot: false } })
const h = (id: string) => ({ id, author: { is_bot: true } })
const ids = (xs: { id: string }[]) => xs.map(x => x.id).join(' ')

console.log('a person leads, and the model fills gaps at a fixed ratio')
{
  const out = arrangeFeed([h('h1'), h('h2'), h('h3'), h('h4'), p('p1'), p('p2'), p('p3')])
  check('order', ids(out), 'p1 p2 h1 p3 h2 h3 h4')
  check('nothing is lost', out.length, 7)
  check('a person is first', out[0].id, 'p1')
}

console.log('\nthe real shape: many model posts, few people')
{
  const feed = [...Array(12)].map((_, i) => h(`h${i}`)).concat([...Array(3)].map((_, i) => p(`p${i}`)))
  const out = arrangeFeed(feed)
  check('a person still leads', out[0].id, 'p0')
  // Not "the model is a third of the feed" — with three people and
  // twelve model posts it can't be, and once people run out the model
  // necessarily fills the rest. What matters is that every person's post
  // is surfaced early instead of being buried under the volume.
  const lastPerson = out.map(x => x.author.is_bot).lastIndexOf(false)
  check('every human post lands in the first five slots', lastPerson <= 4, true)
  check('first four are mostly people', out.slice(0, 4).filter(x => !x.author.is_bot).length, 3)
  check('every post survives', out.length, 15)
  check('no post is duplicated', new Set(out.map(x => x.id)).size, 15)
}

console.log('\nthe model never runs several in a row while people remain')
{
  const out = arrangeFeed([...Array(8)].map((_, i) => h(`h${i}`)).concat([p('a'), p('b'), p('c'), p('d')]))
  let run = 0, worst = 0
  const peopleLeftAfter = (i: number) => out.slice(i).some(x => !x.author.is_bot)
  out.forEach((x, i) => {
    if (x.author.is_bot && peopleLeftAfter(i)) { run++; worst = Math.max(worst, run) } else run = 0
  })
  check('never two model posts back to back while people are left', worst <= 1, true)
}

console.log('\ndegenerate inputs are returned untouched')
check('empty', arrangeFeed([]), [])
check('only people', ids(arrangeFeed([p('a'), p('b')])), 'a b')
check('only model', ids(arrangeFeed([h('a'), h('b')])), 'a b')
check('missing author', arrangeFeed([{ id: 'x' } as any]).length, 1)
check('null author', arrangeFeed([{ id: 'x', author: null } as any]).length, 1)

console.log('\nwithin each kind, newest-first order is preserved')
{
  const out = arrangeFeed([h('h1'), p('p1'), h('h2'), p('p2'), h('h3'), p('p3')])
  const people = out.filter(x => !x.author.is_bot).map(x => x.id)
  const model = out.filter(x => x.author.is_bot).map(x => x.id)
  check('people keep their order', people, ['p1', 'p2', 'p3'])
  check('model keeps its order', model, ['h1', 'h2', 'h3'])
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)

console.log('\nthe joined author is read whether it arrives as object or array')
{
  const asArray = [{ id: 'h', author: [{ is_bot: true }] }, { id: 'p', author: [{ is_bot: false }] }] as any[]
  const out = arrangeFeed(asArray)
  check('a person still leads when author is an array', out[0].id, 'p')
  const mixed = arrangeFeed([{ id: 'h', author: { is_bot: true } }, { id: 'p', author: [{ is_bot: false }] }] as any[])
  check('mixed shapes still sort', mixed[0].id, 'p')
}
console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
