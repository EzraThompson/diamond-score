// ── Enums & simple types ────────────────────────────────────────────

export type GameStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'delayed';
export type InningHalf = 'top' | 'bottom' | 'mid' | 'end';
export type NavTab = 'scores' | 'standings' | 'schedule' | 'settings';

// ── Core interfaces ─────────────────────────────────────────────────

export interface League {
  id: number;
  name: string;
  country?: string;
  logoUrl?: string;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  logoUrl?: string;
  primaryColor?: string;
  rank?: number; // AP/coaches poll rank (1-25); undefined if unranked
  wins?: number;
  losses?: number;
}

export interface RunnersOn {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface Count {
  balls: number;
  strikes: number;
  outs: number;
}

export interface LinescoreInning {
  inning: number;
  home: number | null;
  away: number | null;
}

export interface PlayerInfo {
  id: number;
  name: string;
}

export interface ScheduleNavGame {
  id: number;
  date: string;          // YYYY-MM-DD
  opponent: string;      // abbreviation
  homeOrAway: 'home' | 'away';
  status: GameStatus;
}

export interface Game {
  id: number;
  league: League;
  status: GameStatus;
  scheduledTime: string; // ISO 8601
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  currentInning?: number;
  inningHalf?: InningHalf;
  outs?: number;
  runnersOn?: RunnersOn;
  count?: Count;
  linescore?: LinescoreInning[];
  currentPitcher?: PlayerInfo;
  currentBatter?: PlayerInfo;
  winningPitcher?: PlayerInfo;
  losingPitcher?: PlayerInfo;
  savePitcher?: PlayerInfo;
  homeHits?: number;
  awayHits?: number;
  homeErrors?: number;
  awayErrors?: number;
  homeProbablePitcher?: PlayerInfo;
  awayProbablePitcher?: PlayerInfo;
  tvNetworks?: string[];
}

export interface Standing {
  team: Team;
  division: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  streak: string;
  last10: string;
}

// ── Game detail (live feed enriched) ────────────────────────────────

export interface BatterLine {
  id: number;
  name: string;
  position: string;
  atBats: number;
  runs: number;
  hits: number;
  rbi: number;
  bb: number;
  so: number;
  avg: string;
  note?: string; // 'W', 'L', 'S' for pitchers used as batters (rare)
}

export interface PitcherLine {
  id: number;
  name: string;
  ip: string;
  hits: number;
  runs: number;
  er: number;
  bb: number;
  so: number;
  era: string;
  note?: string; // 'W', 'L', 'S'
}

export interface PlayEvent {
  id: string;
  inning: number;
  half: 'top' | 'bottom';
  event: string;
  description: string;
  rbi: number;
  awayScore: number;
  homeScore: number;
}

export interface GameDetail extends Game {
  venue?: string;
  lastPlayDescription?: string;
  lastPlayEvent?: string;
  batting?: { home: BatterLine[]; away: BatterLine[] };
  pitching?: { home: PitcherLine[]; away: PitcherLine[] };
  plays?: PlayEvent[];
  homeColor?: string;
  awayColor?: string;
  onDeckBatter?: PlayerInfo;
  prevGameHome?: ScheduleNavGame;
  nextGameHome?: ScheduleNavGame;
  prevGameAway?: ScheduleNavGame;
  nextGameAway?: ScheduleNavGame;
}

// ── Legacy aliases (used by existing components) ────────────────────

export type TeamBrief = Team;
export type GameSummary = Game;
export type LeagueInfo = League & { isActive: boolean };
export type StandingsRow = Standing & {
  teamId: number;
  teamName: string;
  abbreviation: string;
  logoUrl?: string;
};

// ── NCAA Rankings ────────────────────────────────────────────────────

export interface RankedCollegeTeam {
  rank: number;
  id: number;
  displayName: string;
  abbreviation: string;
  primaryColor?: string;
  logoUrl?: string;
  conference?: string;
  wins: number;
  losses: number;
}

export interface NCAARankingsData {
  pollName: string;
  teams: RankedCollegeTeam[];
}
