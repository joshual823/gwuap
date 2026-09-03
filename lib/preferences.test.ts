import { cleanPreferences, railLeaguesFor, newsLeaguesFor, MAX_PREFERRED } from './preferences'
import { RAIL_LEAGUES, LEAGUES_WITH_SCORES } from './scores'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('cleanPreferences — never trusts what came out of the database')
check('null', cleanPreferences(null), [])
check('not an array', cleanPreferences('NFL'), [])
check('unknown league dropped', cleanPreferences(['NFL', 'Quidditch']), ['NFL'])
check('non-strings dropped', cleanPreferences(['NFL', 7, null]), ['NFL'])
check('capped at max', cleanPreferences(['NFL','NBA','MLB','NHL']).length, MAX_PREFERRED)
check('good input survives', cleanPreferences(['NFL','Tennis']), ['NFL','Tennis'])

console.log('\nrailLeaguesFor — preferences lead, defaults always backfill')
const none = railLeaguesFor([])
check('no preference = default mix', none, RAIL_LEAGUES)
const nfl = railLeaguesFor(['NFL'])
check('chosen league first', nfl[0], 'NFL')
check('no duplicates', nfl.length, new Set(nfl).size)
check('still covers every default', RAIL_LEAGUES.every(l => nfl.includes(l)), true)

// The case that matters: three leagues that are all out of season.
const winter = railLeaguesFor(['NFL', 'College Football', 'NBA'])
check('out-of-season picks still backfilled', winter.length > 3, true)
check('backfill includes MLB', winter.includes('MLB'), true)

// A league with no scoreboard can't lead the rail, but mustn't empty it.
const boxing = railLeaguesFor(['Boxing'])
check('scoreless league does not lead', boxing[0] !== 'Boxing', true)
check('scoreless league still gets a rail', boxing.length, RAIL_LEAGUES.length)
check('every rail league has a feed', boxing.every(l => LEAGUES_WITH_SCORES.includes(l)), true)

console.log('\nnewsLeaguesFor')
check('no preference = Top', newsLeaguesFor([]), ['Top'])
check('preference used as-is', newsLeaguesFor(['NFL','NBA']), ['NFL','NBA'])

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
