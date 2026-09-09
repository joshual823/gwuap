import { buildRecord, type Settled } from './record'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

let n = 0
const pick = (o: Partial<Settled> = {}): Settled => ({
  status: 'win', profit: 10, game_league: 'NFL', bet_type: 'spread',
  odds_source: 'book', graded_at: `2026-09-${String(++n).padStart(2, '0')}T12:00:00Z`,
  created_at: '2026-09-01T12:00:00Z', ...o,
})

console.log('the headline numbers')
{
  const r = buildRecord([
    pick({ status: 'win' }), pick({ status: 'loss', profit: -10 }),
    pick({ status: 'win' }), pick({ status: 'push', profit: 0 }),
  ])
  check('wins', r.wins, 2)
  check('losses', r.losses, 1)
  check('pushes', r.pushes, 1)
  check('a push does not count as decided', r.decided, 3)
  check('win rate ignores pushes', r.winPct, 66.7)
  check('profit', r.profit, 10)
}

console.log('\nan empty record makes no claim')
{
  const r = buildRecord([])
  check('no win rate rather than 0%', r.winPct, null)
  check('no profit', r.profit, 0)
  check('no form', r.form, [])
  check('no streak', r.streak, 0)
  check('no splits', [r.byLeague.length, r.byBetType.length], [0, 0])
}

console.log('\nself-reported money is left out of profit')
{
  const r = buildRecord([
    pick({ profit: 100, odds_source: 'book' }),
    pick({ profit: 9999, odds_source: 'user' }),
  ])
  check('only book-priced picks count', r.profit, 100)
  check('but both count toward the record', r.wins, 2)
}

console.log('\nsplits, most-played first')
{
  const r = buildRecord([
    pick({ game_league: 'NFL', status: 'win' }),
    pick({ game_league: 'NFL', status: 'loss', profit: -10 }),
    pick({ game_league: 'NFL', status: 'win' }),
    pick({ game_league: 'MLB', status: 'loss', profit: -10 }),
  ])
  check('leagues ordered by volume', r.byLeague.map(s => s.key), ['NFL', 'MLB'])
  check('NFL record', [r.byLeague[0].wins, r.byLeague[0].losses], [2, 1])
  check('NFL win rate', r.byLeague[0].winPct, 66.7)
  check('MLB win rate', r.byLeague[1].winPct, 0)
  check('a null league is dropped, not bucketed as blank',
    buildRecord([pick({ game_league: null })]).byLeague.length, 0)
}

console.log('\nbet types are labelled, not shown as column values')
{
  const r = buildRecord([pick({ bet_type: 'moneyline' }), pick({ bet_type: 'spread' })])
  check('labels are human', r.byBetType.every(s => s.label !== s.key || s.key === s.label), true)
  check('two types', r.byBetType.length, 2)
}

console.log('\nform and streaks read newest-first')
{
  // graded oldest→newest: W W W L W
  const rows = [
    pick({ status: 'win' }), pick({ status: 'win' }), pick({ status: 'win' }),
    pick({ status: 'loss', profit: -10 }), pick({ status: 'win' }),
  ]
  const r = buildRecord(rows)
  check('form newest first', r.form, ['win', 'loss', 'win', 'win', 'win'])
  check('current streak is the latest run', r.streak, 1)
  check('best run was the three before it', r.bestStreak, 3)
}
{
  const r = buildRecord([
    pick({ status: 'win' }), pick({ status: 'loss', profit: -10 }), pick({ status: 'loss', profit: -10 }),
  ])
  check('a losing run is negative', r.streak, -2)
  check('best winning run still counted', r.bestStreak, 1)
}
{
  const r = buildRecord([pick({ status: 'win' }), pick({ status: 'push', profit: 0 })])
  check('a push does not break or extend a run', r.streak, 1)
  check('and is not in form', r.form, ['win'])
}

console.log('\nform is capped at ten')
{
  const r = buildRecord([...Array(14)].map(() => pick({ status: 'win' })))
  check('ten entries', r.form.length, 10)
  check('streak is not capped', r.streak, 14)
}

console.log('\ngraded_at is preferred over created_at for ordering')
{
  const r = buildRecord([
    { ...pick({ status: 'loss', profit: -10 }), graded_at: '2026-09-20T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
    { ...pick({ status: 'win' }), graded_at: '2026-09-21T00:00:00Z', created_at: '2026-01-02T00:00:00Z' },
  ])
  check('newest graded leads the form', r.form[0], 'win')
}
{
  const r = buildRecord([
    { ...pick({ status: 'loss', profit: -10 }), graded_at: null, created_at: '2026-09-01T00:00:00Z' },
    { ...pick({ status: 'win' }), graded_at: null, created_at: '2026-09-02T00:00:00Z' },
  ])
  check('falls back to created_at when never stamped', r.form[0], 'win')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
