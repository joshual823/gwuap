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

export type Ticker = {
  code: string
  name: string
  league: League
  aliases?: string[]
}

export const TICKERS: Ticker[] = [
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
  // ---- Tennis ----
  // Individual sports use the athlete's surname as the code. Unlike team
  // codes these DO go stale — players retire, new ones break through — so
  // treat this as a starting list and edit it freely. It's a plain array.
  { code: 'DJOKOVIC', name: 'Novak Djokovic', league: 'Tennis', aliases: ['novak'] },
  { code: 'ALCARAZ', name: 'Carlos Alcaraz', league: 'Tennis', aliases: ['carlos'] },
  { code: 'SINNER', name: 'Jannik Sinner', league: 'Tennis', aliases: ['jannik'] },
  { code: 'MEDVEDEV', name: 'Daniil Medvedev', league: 'Tennis' },
  { code: 'ZVEREV', name: 'Alexander Zverev', league: 'Tennis', aliases: ['sascha'] },
  { code: 'RUBLEV', name: 'Andrey Rublev', league: 'Tennis' },
  { code: 'TSITSIPAS', name: 'Stefanos Tsitsipas', league: 'Tennis' },
  { code: 'RUUD', name: 'Casper Ruud', league: 'Tennis' },
  { code: 'FRITZ', name: 'Taylor Fritz', league: 'Tennis' },
  { code: 'DEMINAUR', name: 'Alex de Minaur', league: 'Tennis', aliases: ['de minaur'] },
  { code: 'HURKACZ', name: 'Hubert Hurkacz', league: 'Tennis' },
  { code: 'RUNE', name: 'Holger Rune', league: 'Tennis' },
  { code: 'PAUL', name: 'Tommy Paul', league: 'Tennis' },
  { code: 'SHELTON', name: 'Ben Shelton', league: 'Tennis' },
  { code: 'TIAFOE', name: 'Frances Tiafoe', league: 'Tennis' },
  { code: 'MUSETTI', name: 'Lorenzo Musetti', league: 'Tennis' },
  { code: 'DIMITROV', name: 'Grigor Dimitrov', league: 'Tennis' },
  { code: 'KHACHANOV', name: 'Karen Khachanov', league: 'Tennis' },
  { code: 'SWIATEK', name: 'Iga Swiatek', league: 'Tennis', aliases: ['iga'] },
  { code: 'SABALENKA', name: 'Aryna Sabalenka', league: 'Tennis' },
  { code: 'GAUFF', name: 'Coco Gauff', league: 'Tennis', aliases: ['coco'] },
  { code: 'RYBAKINA', name: 'Elena Rybakina', league: 'Tennis' },
  { code: 'PEGULA', name: 'Jessica Pegula', league: 'Tennis' },
  { code: 'ZHENG', name: 'Qinwen Zheng', league: 'Tennis' },
  { code: 'PAOLINI', name: 'Jasmine Paolini', league: 'Tennis' },
  { code: 'VONDROUSOVA', name: 'Marketa Vondrousova', league: 'Tennis' },
  { code: 'JABEUR', name: 'Ons Jabeur', league: 'Tennis' },
  { code: 'COLLINS', name: 'Danielle Collins', league: 'Tennis' },
  { code: 'KEYS', name: 'Madison Keys', league: 'Tennis' },
  { code: 'NAVARRO', name: 'Emma Navarro', league: 'Tennis' },
  { code: 'MUCHOVA', name: 'Karolina Muchova', league: 'Tennis' },
  { code: 'KASATKINA', name: 'Daria Kasatkina', league: 'Tennis' },
  { code: 'OSTAPENKO', name: 'Jelena Ostapenko', league: 'Tennis' },
  { code: 'KREJCIKOVA', name: 'Barbora Krejcikova', league: 'Tennis' },
  { code: 'BADOSA', name: 'Paula Badosa', league: 'Tennis' },
  { code: 'ANDREEVA', name: 'Mirra Andreeva', league: 'Tennis', aliases: ['mirra'] },

  // Deeper tennis field — ATP/WTA main tour and the players who move
  // between it and Challengers. Real players, but NOT a current ranking:
  // rankings churn constantly and this file has no way to know today's.
  // Treat it as a starting list and edit freely. Anything missing gets
  // learned automatically once someone posts it.
  { code: 'BERRETTINI', name: 'Matteo Berrettini', league: 'Tennis' },
  { code: 'AUGERALIASSIME', name: 'Felix Auger-Aliassime', league: 'Tennis', aliases: ['faa', 'auger'] },
  { code: 'NORRIE', name: 'Cameron Norrie', league: 'Tennis' },
  { code: 'CERUNDOLO', name: 'Francisco Cerundolo', league: 'Tennis' },
  { code: 'BAEZ', name: 'Sebastian Baez', league: 'Tennis' },
  { code: 'ETCHEVERRY', name: 'Tomas Martin Etcheverry', league: 'Tennis' },
  { code: 'STRUFF', name: 'Jan-Lennard Struff', league: 'Tennis' },
  { code: 'BUBLIK', name: 'Alexander Bublik', league: 'Tennis' },
  { code: 'HUMBERT', name: 'Ugo Humbert', league: 'Tennis' },
  { code: 'GRIEKSPOOR', name: 'Tallon Griekspoor', league: 'Tennis' },
  { code: 'LEHECKA', name: 'Jiri Lehecka', league: 'Tennis' },
  { code: 'FILS', name: 'Arthur Fils', league: 'Tennis' },
  { code: 'KORDA', name: 'Sebastian Korda', league: 'Tennis' },
  { code: 'NAKASHIMA', name: 'Brandon Nakashima', league: 'Tennis' },
  { code: 'MICHELSEN', name: 'Alex Michelsen', league: 'Tennis' },
  { code: 'COBOLLI', name: 'Flavio Cobolli', league: 'Tennis' },
  { code: 'DARDERI', name: 'Luciano Darderi', league: 'Tennis' },
  { code: 'ARNALDI', name: 'Matteo Arnaldi', league: 'Tennis' },
  { code: 'MENSIK', name: 'Jakub Mensik', league: 'Tennis' },
  { code: 'MACHAC', name: 'Tomas Machac', league: 'Tennis' },
  { code: 'POPYRIN', name: 'Alexei Popyrin', league: 'Tennis' },
  { code: 'SHAPOVALOV', name: 'Denis Shapovalov', league: 'Tennis' },
  { code: 'KECMANOVIC', name: 'Miomir Kecmanovic', league: 'Tennis' },
  { code: 'THOMPSON', name: 'Jordan Thompson', league: 'Tennis' },
  { code: 'KOKKINAKIS', name: 'Thanasi Kokkinakis', league: 'Tennis', aliases: ['kokk'] },
  { code: 'MAROZSAN', name: 'Fabian Marozsan', league: 'Tennis' },
  { code: 'JARRY', name: 'Nicolas Jarry', league: 'Tennis' },
  { code: 'MUNAR', name: 'Jaume Munar', league: 'Tennis' },
  { code: 'NAVONE', name: 'Mariano Navone', league: 'Tennis' },
  { code: 'ZHANGZ', name: 'Zhizhen Zhang', league: 'Tennis', aliases: ['zhizhen'] },
  { code: 'KALINSKAYA', name: 'Anna Kalinskaya', league: 'Tennis' },
  { code: 'SAMSONOVA', name: 'Liudmila Samsonova', league: 'Tennis' },
  { code: 'ALEXANDROVA', name: 'Ekaterina Alexandrova', league: 'Tennis' },
  { code: 'HADDADMAIA', name: 'Beatriz Haddad Maia', league: 'Tennis', aliases: ['bia'] },
  { code: 'KUDERMETOVA', name: 'Veronika Kudermetova', league: 'Tennis' },
  { code: 'FERNANDEZ', name: 'Leylah Fernandez', league: 'Tennis', aliases: ['leylah'] },
  { code: 'ANISIMOVA', name: 'Amanda Anisimova', league: 'Tennis' },
  { code: 'BOULTER', name: 'Katie Boulter', league: 'Tennis' },
  { code: 'RADUCANU', name: 'Emma Raducanu', league: 'Tennis' },
  { code: 'SVITOLINA', name: 'Elina Svitolina', league: 'Tennis' },
  { code: 'PUTINTSEVA', name: 'Yulia Putintseva', league: 'Tennis' },
  { code: 'YASTREMSKA', name: 'Dayana Yastremska', league: 'Tennis' },
  { code: 'MERTENS', name: 'Elise Mertens', league: 'Tennis' },
  { code: 'NOSKOVA', name: 'Linda Noskova', league: 'Tennis' },
  { code: 'SHNAIDER', name: 'Diana Shnaider', league: 'Tennis' },
  { code: 'SAKKARI', name: 'Maria Sakkari', league: 'Tennis' },
  { code: 'KOSTYUK', name: 'Marta Kostyuk', league: 'Tennis' },
  { code: 'OSAKA', name: 'Naomi Osaka', league: 'Tennis', aliases: ['naomi'] },
  { code: 'ZHANGS', name: 'Shuai Zhang', league: 'Tennis', aliases: ['shuai'] },
  { code: 'LINETTE', name: 'Magda Linette', league: 'Tennis' },
  { code: 'BOUZKOVA', name: 'Marie Bouzkova', league: 'Tennis' },
  { code: 'FRECH', name: 'Magdalena Frech', league: 'Tennis' },

  // ---- UFC ----
  { code: 'JONES', name: 'Jon Jones', league: 'UFC', aliases: ['bones'] },
  { code: 'MAKHACHEV', name: 'Islam Makhachev', league: 'UFC', aliases: ['islam'] },
  { code: 'PEREIRA', name: 'Alex Pereira', league: 'UFC', aliases: ['poatan'] },
  { code: 'TOPURIA', name: 'Ilia Topuria', league: 'UFC', aliases: ['el matador'] },
  { code: 'OMALLEY', name: "Sean O'Malley", league: 'UFC', aliases: ['suga', 'omalley'] },
  { code: 'VOLKANOVSKI', name: 'Alexander Volkanovski', league: 'UFC', aliases: ['volk'] },
  { code: 'ADESANYA', name: 'Israel Adesanya', league: 'UFC', aliases: ['izzy', 'stylebender'] },
  { code: 'EDWARDS', name: 'Leon Edwards', league: 'UFC', aliases: ['rocky'] },
  { code: 'DUPLESSIS', name: 'Dricus du Plessis', league: 'UFC', aliases: ['du plessis', 'ddp'] },
  { code: 'CHIMAEV', name: 'Khamzat Chimaev', league: 'UFC', aliases: ['borz'] },
  { code: 'ASPINALL', name: 'Tom Aspinall', league: 'UFC' },
  { code: 'GAETHJE', name: 'Justin Gaethje', league: 'UFC', aliases: ['highlight'] },
  { code: 'POIRIER', name: 'Dustin Poirier', league: 'UFC', aliases: ['diamond'] },
  { code: 'OLIVEIRA', name: 'Charles Oliveira', league: 'UFC', aliases: ['do bronx'] },
  { code: 'HOLLOWAY', name: 'Max Holloway', league: 'UFC', aliases: ['blessed'] },
  { code: 'STERLING', name: 'Aljamain Sterling', league: 'UFC', aliases: ['funkmaster'] },
  { code: 'DVALISHVILI', name: 'Merab Dvalishvili', league: 'UFC', aliases: ['merab'] },
  { code: 'NURMAGOMEDOV', name: 'Umar Nurmagomedov', league: 'UFC', aliases: ['umar'] },
  { code: 'WHITTAKER', name: 'Robert Whittaker', league: 'UFC', aliases: ['bobby knuckles'] },
  { code: 'STRICKLAND', name: 'Sean Strickland', league: 'UFC' },
  { code: 'ANKALAEV', name: 'Magomed Ankalaev', league: 'UFC' },
  { code: 'HILL', name: 'Jamahal Hill', league: 'UFC', aliases: ['sweet dreams'] },
  { code: 'PROCHAZKA', name: 'Jiri Prochazka', league: 'UFC', aliases: ['jiri'] },
  { code: 'SHEVCHENKO', name: 'Valentina Shevchenko', league: 'UFC', aliases: ['bullet'] },
  { code: 'ZHANG', name: 'Zhang Weili', league: 'UFC', aliases: ['weili', 'magnum'] },
  { code: 'GRASSO', name: 'Alexa Grasso', league: 'UFC' },
  { code: 'HARRISON', name: 'Kayla Harrison', league: 'UFC' },
  { code: 'PENNINGTON', name: 'Raquel Pennington', league: 'UFC' },
  { code: 'BLACHOWICZ', name: 'Jan Blachowicz', league: 'UFC' },
  { code: 'RODRIGUEZ', name: 'Yair Rodriguez', league: 'UFC', aliases: ['yair'] },
  { code: 'TSARUKYAN', name: 'Arman Tsarukyan', league: 'UFC', aliases: ['arman'] },
  { code: 'MUHAMMAD', name: 'Belal Muhammad', league: 'UFC', aliases: ['belal'] },
  { code: 'BURNS', name: 'Gilbert Burns', league: 'UFC', aliases: ['durinho'] },
  { code: 'COVINGTON', name: 'Colby Covington', league: 'UFC', aliases: ['chaos'] },
  { code: 'PANTOJA', name: 'Alexandre Pantoja', league: 'UFC' },
  { code: 'MORENO', name: 'Brandon Moreno', league: 'UFC', aliases: ['assassin baby'] },
  { code: 'FIGUEIREDO', name: 'Deiveson Figueiredo', league: 'UFC', aliases: ['deus da guerra'] },
  { code: 'YAN', name: 'Petr Yan', league: 'UFC', aliases: ['no mercy'] },

  // ---- Boxing ----
  { code: 'USYK', name: 'Oleksandr Usyk', league: 'Boxing' },
  { code: 'FURY', name: 'Tyson Fury', league: 'Boxing', aliases: ['gypsy king'] },
  { code: 'JOSHUA', name: 'Anthony Joshua', league: 'Boxing', aliases: ['aj'] },
  { code: 'WILDER', name: 'Deontay Wilder', league: 'Boxing', aliases: ['bronze bomber'] },
  { code: 'CANELO', name: 'Canelo Alvarez', league: 'Boxing', aliases: ['alvarez', 'canelo'] },
  { code: 'CRAWFORD', name: 'Terence Crawford', league: 'Boxing', aliases: ['bud'] },
  { code: 'BIVOL', name: 'Dmitry Bivol', league: 'Boxing' },
  { code: 'BETERBIEV', name: 'Artur Beterbiev', league: 'Boxing' },
  { code: 'INOUE', name: 'Naoya Inoue', league: 'Boxing', aliases: ['monster'] },
  { code: 'DAVIS', name: 'Gervonta Davis', league: 'Boxing', aliases: ['tank'] },
  { code: 'GARCIA', name: 'Ryan Garcia', league: 'Boxing', aliases: ['kingry'] },
  { code: 'HANEY', name: 'Devin Haney', league: 'Boxing' },
  { code: 'LOPEZ', name: 'Teofimo Lopez', league: 'Boxing', aliases: ['teofimo'] },
  { code: 'STEVENSON', name: 'Shakur Stevenson', league: 'Boxing', aliases: ['shakur'] },
  { code: 'BENAVIDEZ', name: 'David Benavidez', league: 'Boxing', aliases: ['monster'] },
  { code: 'MUNGUIA', name: 'Jaime Munguia', league: 'Boxing' },
  { code: 'RODRIGUEZ', name: 'Jesse Rodriguez', league: 'Boxing', aliases: ['bam'] },
  { code: 'TSZYU', name: 'Tim Tszyu', league: 'Boxing' },
  { code: 'DUBOIS', name: 'Daniel Dubois', league: 'Boxing', aliases: ['dynamite'] },
  { code: 'PARKER', name: 'Joseph Parker', league: 'Boxing' },
  { code: 'EUBANK', name: 'Chris Eubank Jr', league: 'Boxing' },
  { code: 'BENN', name: 'Conor Benn', league: 'Boxing' },
  { code: 'CHARLO', name: 'Jermell Charlo', league: 'Boxing' },
  { code: 'RAMIREZ', name: 'Gilberto Ramirez', league: 'Boxing', aliases: ['zurdo'] },

  // ---- Table Tennis (36) ----
  // Codes are given name rather than surname wherever the surname is
  // shared — three of the world's best women are surnamed Wang, and a
  // cashtag has to point at one person.
  { code: 'CHUQIN', name: 'Wang Chuqin', league: 'Table Tennis', aliases: ['wang chuqin'] },
  { code: 'ZHENDONG', name: 'Fan Zhendong', league: 'Table Tennis', aliases: ['fan zhendong'] },
  { code: 'MALONG', name: 'Ma Long', league: 'Table Tennis', aliases: ['ma long', 'dragon'] },
  { code: 'SHIDONG', name: 'Lin Shidong', league: 'Table Tennis', aliases: ['lin shidong'] },
  { code: 'JINGKUN', name: 'Liang Jingkun', league: 'Table Tennis', aliases: ['liang jingkun'] },
  { code: 'MOREGARD', name: 'Truls Moregard', league: 'Table Tennis', aliases: ['truls'] },
  { code: 'CALDERANO', name: 'Hugo Calderano', league: 'Table Tennis', aliases: ['hugo'] },
  { code: 'FLEBRUN', name: 'Felix Lebrun', league: 'Table Tennis', aliases: ['felix lebrun'] },
  { code: 'ALEBRUN', name: 'Alexis Lebrun', league: 'Table Tennis', aliases: ['alexis lebrun'] },
  { code: 'THARIMOTO', name: 'Tomokazu Harimoto', league: 'Table Tennis', aliases: ['tomokazu'] },
  { code: 'OVTCHAROV', name: 'Dimitrij Ovtcharov', league: 'Table Tennis', aliases: ['dima'] },
  { code: 'BOLL', name: 'Timo Boll', league: 'Table Tennis', aliases: ['timo'] },
  { code: 'JORGIC', name: 'Darko Jorgic', league: 'Table Tennis' },
  { code: 'KALLBERG', name: 'Anton Kallberg', league: 'Table Tennis' },
  { code: 'LINYUNJU', name: 'Lin Yun-Ju', league: 'Table Tennis', aliases: ['silent assassin'] },
  { code: 'WOOJIN', name: 'Jang Woojin', league: 'Table Tennis', aliases: ['jang woojin'] },
  { code: 'FRANZISKA', name: 'Patrick Franziska', league: 'Table Tennis' },
  { code: 'GAUZY', name: 'Simon Gauzy', league: 'Table Tennis' },
  { code: 'JHA', name: 'Kanak Jha', league: 'Table Tennis' },
  { code: 'ARUNA', name: 'Quadri Aruna', league: 'Table Tennis' },
  { code: 'YINGSHA', name: 'Sun Yingsha', league: 'Table Tennis', aliases: ['sun yingsha'] },
  { code: 'MANYU', name: 'Wang Manyu', league: 'Table Tennis', aliases: ['wang manyu'] },
  { code: 'CHENMENG', name: 'Chen Meng', league: 'Table Tennis', aliases: ['chen meng'] },
  { code: 'YIDI', name: 'Wang Yidi', league: 'Table Tennis', aliases: ['wang yidi'] },
  { code: 'XINGTONG', name: 'Chen Xingtong', league: 'Table Tennis', aliases: ['chen xingtong'] },
  { code: 'KUAIMAN', name: 'Kuai Man', league: 'Table Tennis', aliases: ['kuai man'] },
  { code: 'ZHUYULING', name: 'Zhu Yuling', league: 'Table Tennis', aliases: ['zhu yuling'] },
  { code: 'HAYATA', name: 'Hina Hayata', league: 'Table Tennis', aliases: ['hina'] },
  { code: 'ITO', name: 'Mima Ito', league: 'Table Tennis', aliases: ['mima'] },
  { code: 'HIRANO', name: 'Miu Hirano', league: 'Table Tennis', aliases: ['miu'] },
  { code: 'MHARIMOTO', name: 'Miwa Harimoto', league: 'Table Tennis', aliases: ['miwa'] },
  { code: 'SHINYUBIN', name: 'Shin Yubin', league: 'Table Tennis', aliases: ['shin yubin'] },
  { code: 'SZOCS', name: 'Bernadette Szocs', league: 'Table Tennis', aliases: ['bernadette'] },
  { code: 'ADIAZ', name: 'Adriana Diaz', league: 'Table Tennis', aliases: ['adriana diaz'] },
  { code: 'POLCANOVA', name: 'Sofia Polcanova', league: 'Table Tennis', aliases: ['sofia'] },
  { code: 'CHENGICHING', name: 'Cheng I-Ching', league: 'Table Tennis', aliases: ['cheng i-ching'] },
]

/** Leagues we have a ticker list for. Anything else stays free text. */
export const SUPPORTED_LEAGUES = ['NBA', 'NFL', 'MLB', 'NHL', 'Tennis', 'Table Tennis', 'UFC', 'Boxing'] as const
export type League = (typeof SUPPORTED_LEAGUES)[number]

export function isSupportedLeague(league: string | null | undefined): boolean {
  return !!league && (SUPPORTED_LEAGUES as readonly string[]).includes(league)
}

/**
 * Teams in `league` matching `query`, best matches first.
 * Code-prefix matches rank above name/alias matches, so typing "LA"
 * surfaces LAL/LAC/LAD before "Atlanta".
 */
export function searchTickers(league: string | null | undefined, query: string, limit = 8): Ticker[] {
  if (!isSupportedLeague(league)) return []
  const pool = TICKERS.filter(t => t.league === league)
  const q = query.trim().toLowerCase()
  if (!q) return pool.slice(0, limit)

  const byCode: Ticker[] = []
  const byName: Ticker[] = []
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
function matchesWords(t: Ticker, q: string): boolean {
  const phrases = [t.name.toLowerCase(), ...(t.aliases ?? [])]
  for (const phrase of phrases) {
    if (phrase.startsWith(q)) return true
    if (phrase.split(/[\s.]+/).some(word => word.startsWith(q))) return true
  }
  return false
}
