// The cashtag universe.
//
// Unlike stock tickers, sports team codes aren't assigned by anyone —
// ESPN and Yahoo disagree. We're picking a standard, so it has to stay
// stable: every historical pick is stored with whatever code we chose,
// and the Trending module groups by that exact string.
//
// Codes are unique WITHIN a league but not across leagues — LAC is both
// the Clippers and the Chargers. The post form already knows which
// league the user picked, so suggestions are always filtered by it and
// the collision never surfaces.
//
// Leagues outside these four (college, soccer, UFC, golf) fall back to
// free text for now: college basketball alone is ~360 teams and soccer
// is effectively unbounded. Worth filling in once someone actually posts
// those picks.

export type Team = {
  code: string
  name: string
  league: 'NBA' | 'NFL' | 'MLB' | 'NHL'
  aliases?: string[]
}

export const TEAMS: Team[] = [
  // ---- NBA (30) ----
  { code: 'ATL', name: 'Atlanta Hawks', league: 'NBA', aliases: ['hawks'] },
  { code: 'BOS', name: 'Boston Celtics', league: 'NBA', aliases: ['celtics'] },
  { code: 'BKN', name: 'Brooklyn Nets', league: 'NBA', aliases: ['nets'] },
  { code: 'CHA', name: 'Charlotte Hornets', league: 'NBA', aliases: ['hornets'] },
  { code: 'CHI', name: 'Chicago Bulls', league: 'NBA', aliases: ['bulls'] },
  { code: 'CLE', name: 'Cleveland Cavaliers', league: 'NBA', aliases: ['cavs', 'cavaliers'] },
  { code: 'DAL', name: 'Dallas Mavericks', league: 'NBA', aliases: ['mavs', 'mavericks'] },
  { code: 'DEN', name: 'Denver Nuggets', league: 'NBA', aliases: ['nuggets'] },
  { code: 'DET', name: 'Detroit Pistons', league: 'NBA', aliases: ['pistons'] },
  { code: 'GSW', name: 'Golden State Warriors', league: 'NBA', aliases: ['warriors', 'dubs'] },
  { code: 'HOU', name: 'Houston Rockets', league: 'NBA', aliases: ['rockets'] },
  { code: 'IND', name: 'Indiana Pacers', league: 'NBA', aliases: ['pacers'] },
  { code: 'LAC', name: 'LA Clippers', league: 'NBA', aliases: ['clippers', 'clips'] },
  { code: 'LAL', name: 'Los Angeles Lakers', league: 'NBA', aliases: ['lakers'] },
  { code: 'MEM', name: 'Memphis Grizzlies', league: 'NBA', aliases: ['grizzlies', 'grizz'] },
  { code: 'MIA', name: 'Miami Heat', league: 'NBA', aliases: ['heat'] },
  { code: 'MIL', name: 'Milwaukee Bucks', league: 'NBA', aliases: ['bucks'] },
  { code: 'MIN', name: 'Minnesota Timberwolves', league: 'NBA', aliases: ['wolves', 'timberwolves'] },
  { code: 'NOP', name: 'New Orleans Pelicans', league: 'NBA', aliases: ['pelicans', 'pels'] },
  { code: 'NYK', name: 'New York Knicks', league: 'NBA', aliases: ['knicks'] },
  { code: 'OKC', name: 'Oklahoma City Thunder', league: 'NBA', aliases: ['thunder'] },
  { code: 'ORL', name: 'Orlando Magic', league: 'NBA', aliases: ['magic'] },
  { code: 'PHI', name: 'Philadelphia 76ers', league: 'NBA', aliases: ['sixers', '76ers'] },
  { code: 'PHX', name: 'Phoenix Suns', league: 'NBA', aliases: ['suns'] },
  { code: 'POR', name: 'Portland Trail Blazers', league: 'NBA', aliases: ['blazers', 'trail blazers'] },
  { code: 'SAC', name: 'Sacramento Kings', league: 'NBA', aliases: ['kings'] },
  { code: 'SAS', name: 'San Antonio Spurs', league: 'NBA', aliases: ['spurs'] },
  { code: 'TOR', name: 'Toronto Raptors', league: 'NBA', aliases: ['raptors', 'raps'] },
  { code: 'UTA', name: 'Utah Jazz', league: 'NBA', aliases: ['jazz'] },
  { code: 'WAS', name: 'Washington Wizards', league: 'NBA', aliases: ['wizards', 'wiz'] },

  // ---- NFL (32) ----
  { code: 'ARI', name: 'Arizona Cardinals', league: 'NFL', aliases: ['cardinals', 'cards'] },
  { code: 'ATL', name: 'Atlanta Falcons', league: 'NFL', aliases: ['falcons'] },
  { code: 'BAL', name: 'Baltimore Ravens', league: 'NFL', aliases: ['ravens'] },
  { code: 'BUF', name: 'Buffalo Bills', league: 'NFL', aliases: ['bills'] },
  { code: 'CAR', name: 'Carolina Panthers', league: 'NFL', aliases: ['panthers'] },
  { code: 'CHI', name: 'Chicago Bears', league: 'NFL', aliases: ['bears'] },
  { code: 'CIN', name: 'Cincinnati Bengals', league: 'NFL', aliases: ['bengals'] },
  { code: 'CLE', name: 'Cleveland Browns', league: 'NFL', aliases: ['browns'] },
  { code: 'DAL', name: 'Dallas Cowboys', league: 'NFL', aliases: ['cowboys', 'boys'] },
  { code: 'DEN', name: 'Denver Broncos', league: 'NFL', aliases: ['broncos'] },
  { code: 'DET', name: 'Detroit Lions', league: 'NFL', aliases: ['lions'] },
  { code: 'GB', name: 'Green Bay Packers', league: 'NFL', aliases: ['packers', 'pack'] },
  { code: 'HOU', name: 'Houston Texans', league: 'NFL', aliases: ['texans'] },
  { code: 'IND', name: 'Indianapolis Colts', league: 'NFL', aliases: ['colts'] },
  { code: 'JAX', name: 'Jacksonville Jaguars', league: 'NFL', aliases: ['jaguars', 'jags'] },
  { code: 'KC', name: 'Kansas City Chiefs', league: 'NFL', aliases: ['chiefs'] },
  { code: 'LV', name: 'Las Vegas Raiders', league: 'NFL', aliases: ['raiders'] },
  { code: 'LAC', name: 'Los Angeles Chargers', league: 'NFL', aliases: ['chargers', 'bolts'] },
  { code: 'LAR', name: 'Los Angeles Rams', league: 'NFL', aliases: ['rams'] },
  { code: 'MIA', name: 'Miami Dolphins', league: 'NFL', aliases: ['dolphins', 'fins'] },
  { code: 'MIN', name: 'Minnesota Vikings', league: 'NFL', aliases: ['vikings', 'vikes'] },
  { code: 'NE', name: 'New England Patriots', league: 'NFL', aliases: ['patriots', 'pats'] },
  { code: 'NO', name: 'New Orleans Saints', league: 'NFL', aliases: ['saints'] },
  { code: 'NYG', name: 'New York Giants', league: 'NFL', aliases: ['giants', 'gmen'] },
  { code: 'NYJ', name: 'New York Jets', league: 'NFL', aliases: ['jets'] },
  { code: 'PHI', name: 'Philadelphia Eagles', league: 'NFL', aliases: ['eagles', 'birds'] },
  { code: 'PIT', name: 'Pittsburgh Steelers', league: 'NFL', aliases: ['steelers'] },
  { code: 'SF', name: 'San Francisco 49ers', league: 'NFL', aliases: ['49ers', 'niners'] },
  { code: 'SEA', name: 'Seattle Seahawks', league: 'NFL', aliases: ['seahawks', 'hawks'] },
  { code: 'TB', name: 'Tampa Bay Buccaneers', league: 'NFL', aliases: ['buccaneers', 'bucs'] },
  { code: 'TEN', name: 'Tennessee Titans', league: 'NFL', aliases: ['titans'] },
  { code: 'WAS', name: 'Washington Commanders', league: 'NFL', aliases: ['commanders', 'commies'] },

  // ---- MLB (30) ----
  { code: 'ARI', name: 'Arizona Diamondbacks', league: 'MLB', aliases: ['diamondbacks', 'dbacks'] },
  { code: 'ATL', name: 'Atlanta Braves', league: 'MLB', aliases: ['braves'] },
  { code: 'BAL', name: 'Baltimore Orioles', league: 'MLB', aliases: ['orioles', 'os'] },
  { code: 'BOS', name: 'Boston Red Sox', league: 'MLB', aliases: ['red sox', 'sox'] },
  { code: 'CHC', name: 'Chicago Cubs', league: 'MLB', aliases: ['cubs'] },
  { code: 'CWS', name: 'Chicago White Sox', league: 'MLB', aliases: ['white sox'] },
  { code: 'CIN', name: 'Cincinnati Reds', league: 'MLB', aliases: ['reds'] },
  { code: 'CLE', name: 'Cleveland Guardians', league: 'MLB', aliases: ['guardians'] },
  { code: 'COL', name: 'Colorado Rockies', league: 'MLB', aliases: ['rockies'] },
  { code: 'DET', name: 'Detroit Tigers', league: 'MLB', aliases: ['tigers'] },
  { code: 'HOU', name: 'Houston Astros', league: 'MLB', aliases: ['astros'] },
  { code: 'KC', name: 'Kansas City Royals', league: 'MLB', aliases: ['royals'] },
  { code: 'LAA', name: 'Los Angeles Angels', league: 'MLB', aliases: ['angels'] },
  { code: 'LAD', name: 'Los Angeles Dodgers', league: 'MLB', aliases: ['dodgers'] },
  { code: 'MIA', name: 'Miami Marlins', league: 'MLB', aliases: ['marlins'] },
  { code: 'MIL', name: 'Milwaukee Brewers', league: 'MLB', aliases: ['brewers'] },
  { code: 'MIN', name: 'Minnesota Twins', league: 'MLB', aliases: ['twins'] },
  { code: 'NYM', name: 'New York Mets', league: 'MLB', aliases: ['mets'] },
  { code: 'NYY', name: 'New York Yankees', league: 'MLB', aliases: ['yankees', 'yanks'] },
  { code: 'ATH', name: 'Athletics', league: 'MLB', aliases: ['as', 'oakland', 'oak'] },
  { code: 'PHI', name: 'Philadelphia Phillies', league: 'MLB', aliases: ['phillies', 'phils'] },
  { code: 'PIT', name: 'Pittsburgh Pirates', league: 'MLB', aliases: ['pirates', 'bucs'] },
  { code: 'SD', name: 'San Diego Padres', league: 'MLB', aliases: ['padres'] },
  { code: 'SF', name: 'San Francisco Giants', league: 'MLB', aliases: ['giants'] },
  { code: 'SEA', name: 'Seattle Mariners', league: 'MLB', aliases: ['mariners', 'ms'] },
  { code: 'STL', name: 'St. Louis Cardinals', league: 'MLB', aliases: ['cardinals', 'cards'] },
  { code: 'TB', name: 'Tampa Bay Rays', league: 'MLB', aliases: ['rays'] },
  { code: 'TEX', name: 'Texas Rangers', league: 'MLB', aliases: ['rangers'] },
  { code: 'TOR', name: 'Toronto Blue Jays', league: 'MLB', aliases: ['blue jays', 'jays'] },
  { code: 'WSH', name: 'Washington Nationals', league: 'MLB', aliases: ['nationals', 'nats'] },

  // ---- NHL (32) ----
  { code: 'ANA', name: 'Anaheim Ducks', league: 'NHL', aliases: ['ducks'] },
  { code: 'BOS', name: 'Boston Bruins', league: 'NHL', aliases: ['bruins'] },
  { code: 'BUF', name: 'Buffalo Sabres', league: 'NHL', aliases: ['sabres'] },
  { code: 'CGY', name: 'Calgary Flames', league: 'NHL', aliases: ['flames'] },
  { code: 'CAR', name: 'Carolina Hurricanes', league: 'NHL', aliases: ['hurricanes', 'canes'] },
  { code: 'CHI', name: 'Chicago Blackhawks', league: 'NHL', aliases: ['blackhawks'] },
  { code: 'COL', name: 'Colorado Avalanche', league: 'NHL', aliases: ['avalanche', 'avs'] },
  { code: 'CBJ', name: 'Columbus Blue Jackets', league: 'NHL', aliases: ['blue jackets'] },
  { code: 'DAL', name: 'Dallas Stars', league: 'NHL', aliases: ['stars'] },
  { code: 'DET', name: 'Detroit Red Wings', league: 'NHL', aliases: ['red wings', 'wings'] },
  { code: 'EDM', name: 'Edmonton Oilers', league: 'NHL', aliases: ['oilers'] },
  { code: 'FLA', name: 'Florida Panthers', league: 'NHL', aliases: ['panthers'] },
  { code: 'LAK', name: 'Los Angeles Kings', league: 'NHL', aliases: ['kings'] },
  { code: 'MIN', name: 'Minnesota Wild', league: 'NHL', aliases: ['wild'] },
  { code: 'MTL', name: 'Montreal Canadiens', league: 'NHL', aliases: ['canadiens', 'habs'] },
  { code: 'NSH', name: 'Nashville Predators', league: 'NHL', aliases: ['predators', 'preds'] },
  { code: 'NJD', name: 'New Jersey Devils', league: 'NHL', aliases: ['devils'] },
  { code: 'NYI', name: 'New York Islanders', league: 'NHL', aliases: ['islanders', 'isles'] },
  { code: 'NYR', name: 'New York Rangers', league: 'NHL', aliases: ['rangers'] },
  { code: 'OTT', name: 'Ottawa Senators', league: 'NHL', aliases: ['senators', 'sens'] },
  { code: 'PHI', name: 'Philadelphia Flyers', league: 'NHL', aliases: ['flyers'] },
  { code: 'PIT', name: 'Pittsburgh Penguins', league: 'NHL', aliases: ['penguins', 'pens'] },
  { code: 'SJS', name: 'San Jose Sharks', league: 'NHL', aliases: ['sharks'] },
  { code: 'SEA', name: 'Seattle Kraken', league: 'NHL', aliases: ['kraken'] },
  { code: 'STL', name: 'St. Louis Blues', league: 'NHL', aliases: ['blues'] },
  { code: 'TBL', name: 'Tampa Bay Lightning', league: 'NHL', aliases: ['lightning', 'bolts'] },
  { code: 'TOR', name: 'Toronto Maple Leafs', league: 'NHL', aliases: ['maple leafs', 'leafs'] },
  { code: 'UTA', name: 'Utah Mammoth', league: 'NHL', aliases: ['mammoth', 'utah'] },
  { code: 'VAN', name: 'Vancouver Canucks', league: 'NHL', aliases: ['canucks'] },
  { code: 'VGK', name: 'Vegas Golden Knights', league: 'NHL', aliases: ['golden knights', 'knights'] },
  { code: 'WSH', name: 'Washington Capitals', league: 'NHL', aliases: ['capitals', 'caps'] },
  { code: 'WPG', name: 'Winnipeg Jets', league: 'NHL', aliases: ['jets'] },
]

/** Leagues we have a team list for. Anything else stays free text. */
export const SUPPORTED_LEAGUES = ['NBA', 'NFL', 'MLB', 'NHL'] as const

export function isSupportedLeague(league: string | null | undefined): boolean {
  return !!league && (SUPPORTED_LEAGUES as readonly string[]).includes(league)
}

/**
 * Teams in `league` matching `query`, best matches first.
 * Code-prefix matches rank above name/alias matches, so typing "LA"
 * surfaces LAL/LAC/LAD before "Atlanta".
 */
export function searchTeams(league: string | null | undefined, query: string, limit = 8): Team[] {
  if (!isSupportedLeague(league)) return []
  const pool = TEAMS.filter(t => t.league === league)
  const q = query.trim().toLowerCase()
  if (!q) return pool.slice(0, limit)

  const byCode: Team[] = []
  const byName: Team[] = []
  for (const t of pool) {
    if (t.code.toLowerCase().startsWith(q)) { byCode.push(t); continue }
    if (matchesWords(t, q)) byName.push(t)
  }
  return [...byCode, ...byName].slice(0, limit)
}

/**
 * True if the query prefixes the full name/alias or any single word in
 * them. Word-prefix rather than plain substring, so typing "l" doesn't
 * match "AtLanta" — a one-letter substring match hits nearly everything.
 */
function matchesWords(t: Team, q: string): boolean {
  const phrases = [t.name.toLowerCase(), ...(t.aliases ?? [])]
  for (const phrase of phrases) {
    if (phrase.startsWith(q)) return true
    if (phrase.split(/[\s.]+/).some(word => word.startsWith(q))) return true
  }
  return false
}
