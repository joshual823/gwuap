/**
 * What a contest and its competitors are called, per league.
 *
 * "Those are the same team" is wrong about tennis, where people say
 * match and player, and wrong about a fight card twice over. Getting the
 * noun right is most of what makes a message sound like it was written
 * by someone who follows the sport.
 */
type Words = { event: string; events: string; side: string; sides: string }

const TEAM: Words = { event: 'game', events: 'games', side: 'team', sides: 'teams' }

const BY_LEAGUE: Record<string, Words> = {
  Tennis: { event: 'match', events: 'matches', side: 'player', sides: 'players' },
  'Table Tennis': { event: 'match', events: 'matches', side: 'player', sides: 'players' },
  UFC: { event: 'fight', events: 'fights', side: 'fighter', sides: 'fighters' },
  Boxing: { event: 'fight', events: 'fights', side: 'fighter', sides: 'fighters' },
  Golf: { event: 'tournament', events: 'tournaments', side: 'player', sides: 'players' },
}

export function wordsFor(league: string | null | undefined): Words {
  return (league && BY_LEAGUE[league]) || TEAM
}
