/**
 * Static registry of all teams across MLB, NPB, KBO, and WBC.
 * Abbreviations must exactly match what each data source returns in Team.abbreviation.
 */

export interface RegistryTeam {
  abbreviation: string;
  name: string;
  primaryColor: string;
  leagueId: number;
  leagueName: string;
}

export const ALL_TEAMS: RegistryTeam[] = [
  // ── MLB ──────────────────────────────────────────────────────────────
  { abbreviation: 'ARI', name: 'Diamondbacks',  primaryColor: '#A71930', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'ATL', name: 'Braves',         primaryColor: '#CE1141', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'BAL', name: 'Orioles',        primaryColor: '#DF4601', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'BOS', name: 'Red Sox',        primaryColor: '#BD3039', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'CHC', name: 'Cubs',           primaryColor: '#0E3386', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'CWS', name: 'White Sox',      primaryColor: '#27251F', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'CIN', name: 'Reds',           primaryColor: '#C6011F', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'CLE', name: 'Guardians',      primaryColor: '#00385D', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'COL', name: 'Rockies',        primaryColor: '#33006F', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'DET', name: 'Tigers',         primaryColor: '#0C2340', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'HOU', name: 'Astros',         primaryColor: '#EB6E1F', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'KC',  name: 'Royals',         primaryColor: '#004687', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'LAA', name: 'Angels',         primaryColor: '#BA0021', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'LAD', name: 'Dodgers',        primaryColor: '#005A9C', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'MIA', name: 'Marlins',        primaryColor: '#00A3E0', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'MIL', name: 'Brewers',        primaryColor: '#12284B', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'MIN', name: 'Twins',          primaryColor: '#002B5C', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'NYM', name: 'Mets',           primaryColor: '#002D72', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'NYY', name: 'Yankees',        primaryColor: '#132448', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'OAK', name: 'Athletics',      primaryColor: '#003831', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'PHI', name: 'Phillies',       primaryColor: '#E81828', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'PIT', name: 'Pirates',        primaryColor: '#27251F', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'SD',  name: 'Padres',         primaryColor: '#2F241D', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'SEA', name: 'Mariners',       primaryColor: '#0C2C56', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'SF',  name: 'Giants',         primaryColor: '#FD5A1E', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'STL', name: 'Cardinals',      primaryColor: '#C41E3A', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'TB',  name: 'Rays',           primaryColor: '#092C5C', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'TEX', name: 'Rangers',        primaryColor: '#003278', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'TOR', name: 'Blue Jays',      primaryColor: '#134A8E', leagueId: 1, leagueName: 'MLB' },
  { abbreviation: 'WSH', name: 'Nationals',      primaryColor: '#14225A', leagueId: 1, leagueName: 'MLB' },

  // ── NPB ──────────────────────────────────────────────────────────────
  { abbreviation: 'GNT', name: 'Yomiuri Giants',         primaryColor: '#F15A22', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'HNS', name: 'Hanshin Tigers',         primaryColor: '#FFE200', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'DBS', name: 'DeNA BayStars',          primaryColor: '#003087', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'CAR', name: 'Hiroshima Carp',         primaryColor: '#C8102E', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'DGN', name: 'Chunichi Dragons',       primaryColor: '#003A78', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'SWL', name: 'Tokyo Yakult Swallows',  primaryColor: '#004098', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'BUF', name: 'Orix Buffaloes',         primaryColor: '#00356D', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'HWK', name: 'SoftBank Hawks',         primaryColor: '#FCC40D', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'EGL', name: 'Rakuten Eagles',         primaryColor: '#9E1B32', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'LNS', name: 'Seibu Lions',            primaryColor: '#00578A', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'MRN', name: 'Lotte Marines',          primaryColor: '#000000', leagueId: 2, leagueName: 'NPB' },
  { abbreviation: 'FGT', name: 'Nippon-Ham Fighters',    primaryColor: '#0C1C5F', leagueId: 2, leagueName: 'NPB' },

  // ── KBO ──────────────────────────────────────────────────────────────
  { abbreviation: 'LGT', name: 'LG Twins',       primaryColor: '#C30452', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'DSN', name: 'Doosan Bears',   primaryColor: '#131230', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'KIA', name: 'KIA Tigers',     primaryColor: '#EA0029', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'SAM', name: 'Samsung Lions',  primaryColor: '#074CA1', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'HNW', name: 'Hanwha Eagles',  primaryColor: '#FF6600', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'SSG', name: 'SSG Landers',    primaryColor: '#CE0E2D', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'LOT', name: 'Lotte Giants',   primaryColor: '#041E42', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'KWM', name: 'Kiwoom Heroes',  primaryColor: '#820024', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'KTW', name: 'KT Wiz',         primaryColor: '#000000', leagueId: 3, leagueName: 'KBO' },
  { abbreviation: 'NCD', name: 'NC Dinos',        primaryColor: '#315288', leagueId: 3, leagueName: 'KBO' },

  // ── WBC (World Baseball Classic) — leagueId: 20 ──────────────────────
  // Abbreviations match ESPN's WBC team abbreviations
  { abbreviation: 'USA', name: 'United States',  primaryColor: '#002868', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'JPN', name: 'Japan',          primaryColor: '#BC002D', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'DOM', name: 'Dominican Rep.', primaryColor: '#002D62', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'PRI', name: 'Puerto Rico',    primaryColor: '#ED0C2D', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'MEX', name: 'Mexico',         primaryColor: '#006847', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'VEN', name: 'Venezuela',      primaryColor: '#CF142B', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'CUB', name: 'Cuba',           primaryColor: '#003087', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'KOR', name: 'South Korea',    primaryColor: '#CD2E3A', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'TPE', name: 'Chinese Taipei', primaryColor: '#003580', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'PAN', name: 'Panama',         primaryColor: '#DA121A', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'NED', name: 'Netherlands',    primaryColor: '#FF4B00', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'ITA', name: 'Italy',          primaryColor: '#009246', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'ISR', name: 'Israel',         primaryColor: '#003087', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'AUS', name: 'Australia',      primaryColor: '#00843D', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'CLM', name: 'Colombia',       primaryColor: '#FCD116', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'CAN', name: 'Canada',         primaryColor: '#FF0000', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'NIC', name: 'Nicaragua',      primaryColor: '#003F87', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'GBR', name: 'Great Britain',  primaryColor: '#012169', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'CZE', name: 'Czech Republic', primaryColor: '#11457E', leagueId: 20, leagueName: 'WBC' },
  { abbreviation: 'CHN', name: 'China',          primaryColor: '#DE2910', leagueId: 20, leagueName: 'WBC' },
];

export function getTeamsByLeague(leagueId: number): RegistryTeam[] {
  return ALL_TEAMS.filter((t) => t.leagueId === leagueId);
}

export function findTeam(abbreviation: string): RegistryTeam | undefined {
  return ALL_TEAMS.find((t) => t.abbreviation === abbreviation);
}
