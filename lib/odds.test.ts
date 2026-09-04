import { splitAmericanOdds, formatAmericanOdds, labelFor, BET_TYPES, QUICK_ODDS,
         wantsMatchup, allowsOpponent, pricingNeedsReview } from './odds'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}

console.log('a book price survives the round trip into the form and back')
// This is the whole point: the link carries a price, the form splits it
// into a sign and digits, and the comparison that decides "is this still
// the book's number" has to see them as equal.
for (const price of ['+113', '-125', '+104', '-110', '+150', '-1200', '+10000']) {
  const parts = splitAmericanOdds(price)
  const rebuilt = parts ? `${parts.sign}${parts.digits}` : null
  check(`${price} round-trips`, rebuilt, formatAmericanOdds(price))
  check(`${price} equals itself`, rebuilt === price, true)
}

console.log('\nunsigned odds are read as favourites, the way the form does')
check('110 -> -110', formatAmericanOdds('110'), '-110')

console.log('\nrubbish is refused rather than guessed at')
for (const bad of ['', '  ', 'abc', '+', '-', '99', '+9', null, undefined, '1.5', '+12a']) {
  check(`${JSON.stringify(bad)} -> null`, formatAmericanOdds(bad as any), null)
}

console.log('\nquick-odds chips are all valid prices')
check('every chip parses', QUICK_ODDS.every(o => formatAmericanOdds(o) === o), true)

console.log('\ndirections are named for the bet they are on')
check('first inning under = NRFI', labelFor('under', 'first_inning'), 'NRFI')
check('first inning over = YRFI',  labelFor('over',  'first_inning'), 'YRFI')
check('a plain total stays Under', labelFor('under', 'total'), 'Under')
check('no bet type falls back',    labelFor('under'), 'Under')
check('F5 total',                  labelFor('over',  'first_five'), 'Over F5')
check('F5 who-leads',              labelFor('backing', 'first_five_ml'), 'Leads at 5')
check('F5 tie',                    labelFor('tie', 'first_five_ml'), 'Tied at 5')
check('1H who-leads',              labelFor('fading', 'first_half_ml'), 'Trails at half')
check('moneyline is unchanged',    labelFor('backing', 'moneyline'), 'Backing')
check('parlay is unchanged',       labelFor('backing', 'parlay'), 'Backing')

console.log('\nevery bet type has a chip-sized name')
check('all have a label', BET_TYPES.every(b => (b.short ?? b.label).length <= 14), true)

console.log('\na take can name an opponent; a pick only where the bet has two sides')
// The distinction the two functions carry: wantsMatchup means the bet is
// about a fixture and both sides belong to it, which also flips the
// direction buttons to Over/Under. allowsOpponent only means the field
// is offered. Conflating them would have made every take read Over/Under.
check('take may name an opponent',       allowsOpponent('take', 'moneyline'), true)
check('take does not require a matchup', wantsMatchup('take', 'moneyline'), false)
check('take on a total still offers it', allowsOpponent('take', 'total'), true)
check('take never flips to over/under',  wantsMatchup('take', 'total'), false)
check('pick moneyline: one side',        allowsOpponent('pick', 'moneyline'), false)
check('pick total: both sides',          allowsOpponent('pick', 'total'), true)
check('pick total wants the matchup',    wantsMatchup('pick', 'total'), true)
check('pick NRFI is on the fixture',     allowsOpponent('pick', 'first_inning'), true)
check('pick prop is on one side',        allowsOpponent('pick', 'player_prop'), false)

console.log('\na pick with no money still settles')
// The regression this exists to stop: money became opt-in, so most picks
// carry no stake, and profitForStatus returns null for every one of
// them. Treating that null as a pricing failure sent every free pick to
// the review queue instead of onto the leaderboard — the whole point of
// the site, silently switched off.
check('free win is not a problem',      pricingNeedsReview('win',  null,   null), false)
check('free loss is not a problem',     pricingNeedsReview('loss', null,   null), false)
check('free push is not a problem',     pricingNeedsReview('push', null,   null), false)
check('free pick with odds, no stake',  pricingNeedsReview('win',  '-110', null), false)

console.log('\nbut a pick with money on it still has to price')
check('staked win prices fine',   pricingNeedsReview('win',  '-110', 50), false)
check('staked loss prices fine',  pricingNeedsReview('loss', null,   50), false)
// A staked win with unreadable odds is the real data problem: there is a
// dollar figure owed and no way to work it out.
check('staked win, garbled odds', pricingNeedsReview('win',  'abc',  50), true)
check('staked win, no odds',      pricingNeedsReview('win',  null,   50), true)
check('void never needs review',  pricingNeedsReview('void', 'abc',  50), false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
