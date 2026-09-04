import { gradePick, isGradeable, needsReview, BLOCKED_LABELS } from './grade'
import type { Game } from './scores'

function game(awayCode: string, awayScore: string | null, homeCode: string, homeScore: string | null,
              state: Game['state'] = 'post'): Game {
  return {
    id: 'x', league: 'NFL', state, status: '', startsAt: null, spread: null, overUnder: null,
    away: { code: awayCode, name: awayCode, score: awayScore, logo: null },
    home: { code: homeCode, name: homeCode, score: homeScore, logo: null },
  }
}

let pass = 0, fail = 0
// gradePick returns a result object now. Tests still read as "this pick
// should be a win", so unwrap here rather than in thirty call sites.
function unwrap(r: any) {
  if (r && typeof r === 'object' && 'outcome' in r) return r.outcome
  if (r && typeof r === 'object' && 'blocked' in r) return null
  return r
}

function check(label: string, gotRaw: unknown, want: unknown) {
  const got = unwrap(gotRaw)
  const ok = got === want
  ok ? pass++ : fail++
  if (!ok) console.log(`  FAIL ${label}: got ${got}, want ${want}`)
  else console.log(`  ok   ${label} -> ${got}`)
}

// SF 27, LAR 20. SF won by 7.
const g = game('SF', '27', 'LAR', '20')

console.log('MONEYLINE')
check('back SF (won)',        gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, g), 'win')
check('fade SF (won)',        gradePick({betType:'moneyline',sentiment:'fading', ticker:'$SF',line:null}, g), 'loss')
check('back LAR (lost)',      gradePick({betType:'moneyline',sentiment:'backing',ticker:'$LAR',line:null}, g), 'loss')
check('fade LAR (lost)',      gradePick({betType:'moneyline',sentiment:'fading', ticker:'$LAR',line:null}, g), 'win')

console.log('SPREAD — SF won by 7')
check('SF -3.5 backing',      gradePick({betType:'spread',sentiment:'backing',ticker:'$SF',line:-3.5}, g), 'win')
check('SF -7.5 backing',      gradePick({betType:'spread',sentiment:'backing',ticker:'$SF',line:-7.5}, g), 'loss')
check('SF -7 backing (push)', gradePick({betType:'spread',sentiment:'backing',ticker:'$SF',line:-7}, g), 'push')
check('SF -3.5 fading',       gradePick({betType:'spread',sentiment:'fading', ticker:'$SF',line:-3.5}, g), 'loss')
check('SF -7.5 fading',       gradePick({betType:'spread',sentiment:'fading', ticker:'$SF',line:-7.5}, g), 'win')
check('LAR +7.5 backing',     gradePick({betType:'spread',sentiment:'backing',ticker:'$LAR',line:7.5}, g), 'win')
check('LAR +3.5 backing',     gradePick({betType:'spread',sentiment:'backing',ticker:'$LAR',line:3.5}, g), 'loss')
check('LAR +7 backing(push)', gradePick({betType:'spread',sentiment:'backing',ticker:'$LAR',line:7}, g), 'push')

console.log('TOTAL — combined 47')
check('over 44.5',            gradePick({betType:'total',sentiment:'over', ticker:null,line:44.5}, g), 'win')
check('over 50.5',            gradePick({betType:'total',sentiment:'over', ticker:null,line:50.5}, g), 'loss')
check('under 50.5',           gradePick({betType:'total',sentiment:'under',ticker:null,line:50.5}, g), 'win')
check('under 44.5',           gradePick({betType:'total',sentiment:'under',ticker:null,line:44.5}, g), 'loss')
check('over 47 (push)',       gradePick({betType:'total',sentiment:'over', ticker:null,line:47}, g), 'push')

console.log('REFUSALS — must return null, never a guess')
check('game not final',       gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, game('SF','27','LAR','20','in')), null)
check('no score yet',         gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, game('SF',null,'LAR',null)), null)
check('parlay',               gradePick({betType:'parlay',sentiment:'backing',ticker:'$SF',line:null}, g), null)
check('player prop',          gradePick({betType:'player_prop',sentiment:'over',ticker:'$SF',line:20}, g), null)
check('future',               gradePick({betType:'future',sentiment:'backing',ticker:'$SF',line:null}, g), null)
check('ticker not in game',   gradePick({betType:'moneyline',sentiment:'backing',ticker:'$KC',line:null}, g), null)
check('spread without line',  gradePick({betType:'spread',sentiment:'backing',ticker:'$SF',line:null}, g), null)
check('total without line',   gradePick({betType:'total',sentiment:'over',ticker:null,line:null}, g), null)
check('neutral sentiment',    gradePick({betType:'moneyline',sentiment:'neutral',ticker:'$SF',line:null}, g), null)
check('total w/ backing',     gradePick({betType:'total',sentiment:'backing',ticker:'$SF',line:44.5}, g), null)

console.log('CASE / FORMAT TOLERANCE')
check('lowercase no dollar',  gradePick({betType:'moneyline',sentiment:'backing',ticker:'sf',line:null}, g), 'win')
check('draw -> push',         gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, game('SF','20','LAR','20')), 'push')

console.log('REFUSALS SAY WHY — this is what feeds the review queue')
function blockedReason(r: any) { return r && 'blocked' in r ? r.blocked : `graded:${r?.outcome}` }
const g2 = (a: string | null, h: string | null, st: Game['state'] = 'post') => game('SF', a, 'LAR', h, st)

check('unfinished game is waiting, not stuck',
  blockedReason(gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, g2('27','20','in'))),
  'not-final')
check('finished with no score needs a human',
  blockedReason(gradePick({betType:'moneyline',sentiment:'backing',ticker:'$SF',line:null}, g2(null,null))),
  'no-score')
check('parlay is unsupported, not broken',
  blockedReason(gradePick({betType:'parlay',sentiment:'backing',ticker:'$SF',line:null}, g)),
  'unsupported-bet')
check('wrong team named',
  blockedReason(gradePick({betType:'moneyline',sentiment:'backing',ticker:'$KC',line:null}, g)),
  'team-not-in-game')
check('spread with no number',
  blockedReason(gradePick({betType:'spread',sentiment:'backing',ticker:'$SF',line:null}, g)),
  'missing-line')
check('total with no number',
  blockedReason(gradePick({betType:'total',sentiment:'over',ticker:null,line:null}, g)),
  'missing-line')
check('neutral has no side',
  blockedReason(gradePick({betType:'moneyline',sentiment:'neutral',ticker:'$SF',line:null}, g)),
  'no-side')

console.log('ONLY THE STUCK ONES REACH THE QUEUE')
check('waiting is not review',       needsReview('not-final'), false)
check('unsupported is not review',   needsReview('unsupported-bet'), false)
check('no score IS review',          needsReview('no-score'), true)
check('wrong team IS review',        needsReview('team-not-in-game'), true)
check('missing line IS review',      needsReview('missing-line'), true)
check('every reason has a label',
  (['not-final','no-score','unsupported-bet','team-not-in-game','missing-line','no-side'] as const)
    .every(r => typeof BLOCKED_LABELS[r] === 'string' && BLOCKED_LABELS[r].length > 0), true)

console.log('DECIDED CONTESTS — a fight has no score, so it arrives as 1-0')
const fight = game('WELLS', '1', 'OROLBAI', '0')
check('back the winner',  gradePick({betType:'moneyline',sentiment:'backing',ticker:'$WELLS',line:null}, fight), 'win')
check('back the loser',   gradePick({betType:'moneyline',sentiment:'backing',ticker:'$OROLBAI',line:null}, fight), 'loss')
check('fade the loser',   gradePick({betType:'moneyline',sentiment:'fading', ticker:'$OROLBAI',line:null}, fight), 'win')
const draw = game('A', '0', 'B', '0')
check('draw is a push',   gradePick({betType:'moneyline',sentiment:'backing',ticker:'$A',line:null}, draw), 'push')

console.log('PART-OF-GAME BETS — settled from innings / quarters')
// PIT [2,0,0,0,0,2,0,1] vs SF [0,0,0,0,0,0,2,0,0] — a real 5-2 final.
function withPeriods(a: string[], h: string[], aTot: string, hTot: string): Game {
  const g = game('SF', aTot, 'PIT', hTot)
  return { ...g, away: { ...g.away, byPeriod: a }, home: { ...g.home, byPeriod: h } }
}
const mlb = withPeriods(
  ['0','0','0','0','0','0','2','0','0'],
  ['2','0','0','0','0','2','0','1'], '2', '5')

// First inning: 0 + 2 = 2 runs, so YRFI.
check('NRFI loses (2 ran)',  gradePick({betType:'first_inning',sentiment:'under',ticker:null,line:0.5}, mlb), 'loss')
check('YRFI wins',           gradePick({betType:'first_inning',sentiment:'over', ticker:null,line:0.5}, mlb), 'win')
check('NRFI needs no line',  gradePick({betType:'first_inning',sentiment:'over', ticker:null,line:null}, mlb), 'win')

// First five: SF 0, PIT 2 = 2.
check('F5 over 1.5',         gradePick({betType:'first_five',sentiment:'over', ticker:null,line:1.5}, mlb), 'win')
check('F5 under 1.5',        gradePick({betType:'first_five',sentiment:'under',ticker:null,line:1.5}, mlb), 'loss')
check('F5 push on 2',        gradePick({betType:'first_five',sentiment:'over', ticker:null,line:2}, mlb), 'push')

// NFL: TB [10,3,0,3] vs CAR [0,7,0,7] — first half 10+3+0+7 = 20.
const nfl = withPeriods(['0','7','0','7'], ['10','3','0','3'], '14', '16')
check('1H over 19.5',        gradePick({betType:'first_half',sentiment:'over', ticker:null,line:19.5}, nfl), 'win')
check('1H under 19.5',       gradePick({betType:'first_half',sentiment:'under',ticker:null,line:19.5}, nfl), 'loss')

console.log('AND THEY REFUSE WHEN THE PERIODS WEREN\'T PLAYED')
const short = withPeriods(['0','1'], ['0','0'], '1', '0')   // only 2 innings
check('F5 on a 2-inning game', blockedReason(gradePick({betType:'first_five',sentiment:'over',ticker:null,line:1.5}, short)), 'no-score')
check('but 1H is fine',        gradePick({betType:'first_half',sentiment:'over',ticker:null,line:0.5}, short), 'win')
const noPeriods = game('SF','2','PIT','5')
check('no periods at all',     blockedReason(gradePick({betType:'first_inning',sentiment:'over',ticker:null,line:0.5}, noPeriods)), 'no-score')

console.log('isGradeable'); check('moneyline', isGradeable('moneyline'), true); check('parlay', isGradeable('parlay'), false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
