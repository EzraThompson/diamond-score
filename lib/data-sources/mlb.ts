/**
 * MLB Data Source
 * Fetches live scores, schedules, and standings from the MLB Stats API.
 * https://statsapi.mlb.com
 */

import { gameCache, standingsCache } from '../cache';
import type {
  BatterLine,
  Game,
  GameDetail,
  GameStatus,
  InningHalf,
  League,
  LinescoreInning,
  PitcherLine,
  PlayEvent,
  PlayerInfo,
  RunnersOn,
  Standing,
  Team,
} from '../types';

// ── Constants ───────────────────────────────────────────────────────

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const MLB_API_LIVE = 'https://statsapi.mlb.com/api/v1.1';

const MLB_LEAGUE: League = {
  id: 1,
  name: 'MLB',
  country: 'USA',
  logoUrl: '/logos/mlb.svg',
};

// ── MLB API response types ──────────────────────────────────────────

interface MLBScheduleResponse {
  dates: {
    date: string;
    games: MLBGame[];
  }[];
}

interface MLBGame {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameCode: string;   // 'P' | 'L' | 'F'
    detailedState: string;      // 'Scheduled', 'In Progress', 'Final', etc.
    codedGameState: string;     // 'S', 'P', 'I', 'F', etc.
    statusCode: string;         // 'S', 'P', 'I', 'F', 'DR', 'DI', etc.
  };
  teams: {
    home: MLBGameTeam;
    away: MLBGameTeam;
  };
  linescore?: MLBLinescore;
}

interface MLBGameTeam {
  score?: number;
  team: {
    id: number;
    name: string;
    abbreviation?: string;
  };
  leagueRecord?: { wins: number; losses: number; pct: string };
}

interface MLBLinescore {
  currentInning?: number;
  currentInningOrdinal?: string;
  inningHalf?: string;         // 'Top' | 'Bottom'
  isTopInning?: boolean;
  innings?: {
    num: number;
    home: { runs?: number };
    away: { runs?: number };
  }[];
  teams?: {
    home: { runs?: number; hits?: number; errors?: number };
    away: { runs?: number; hits?: number; errors?: number };
  };
  outs?: number;
  balls?: number;
  strikes?: number;
}

interface MLBLiveFeed {
  liveData: {
    linescore: MLBLinescore;
    plays: {
      currentPlay?: {
        matchup: {
          batter: { id: number; fullName: string };
          pitcher: { id: number; fullName: string };
        };
        runners: { movement: { start?: string; end?: string; isOut?: boolean } }[];
        count: { balls: number; strikes: number; outs: number };
      };
    };
  };
  gameData: {
    probablePitchers?: {
      home?: { id: number; fullName: string };
      away?: { id: number; fullName: string };
    };
    status: MLBGame['status'];
  };
}

// ── Full live feed for game detail page ─────────────────────────────

interface MLBBoxscorePlayer {
  person: { id: number; fullName: string };
  position: { abbreviation: string; type: string };
  stats: {
    batting?: {
      atBats?: number; runs?: number; hits?: number; rbi?: number;
      baseOnBalls?: number; strikeOuts?: number; avg?: string;
    };
    pitching?: {
      inningsPitched?: string; hits?: number; runs?: number; earnedRuns?: number;
      baseOnBalls?: number; strikeOuts?: number; era?: string; note?: string;
    };
  };
  battingOrder?: string;
}

interface MLBBoxscoreTeam {
  players: Record<string, MLBBoxscorePlayer>;
  batters: number[];
  pitchers: number[];
  note?: { label: string; value: string }[];
  info?: { title: string; fieldList: { label: string; value: string }[] }[];
}

interface MLBPlayResult {
  description: string;
  event: string;
  rbi?: number;
  awayScore?: number;
  homeScore?: number;
}

interface MLBPlayAbout {
  inning: number;
  halfInning: string;
  isTopInning: boolean;
  isComplete: boolean;
  atBatIndex: number;
}

interface MLBFullLiveFeed {
  gameData: {
    game: { pk: number };
    status: MLBGame['status'];
    teams: {
      home: { id: number; name: string; abbreviation?: string };
      away: { id: number; name: string; abbreviation?: string };
    };
    probablePitchers?: {
      home?: { id: number; fullName: string };
      away?: { id: number; fullName: string };
    };
    venue?: { name: string };
  };
  liveData: {
    plays: {
      allPlays: { result: MLBPlayResult; about: MLBPlayAbout }[];
      currentPlay?: {
        result: MLBPlayResult;
        about: MLBPlayAbout;
        count: { balls: number; strikes: number; outs: number };
        matchup: {
          batter: { id: number; fullName: string };
          pitcher: { id: number; fullName: string };
        };
        runners: { movement: { start?: string; end?: string; isOut?: boolean } }[];
      };
    };
    linescore: MLBLinescore;
    boxscore: {
      teams: {
        home: MLBBoxscoreTeam;
        away: MLBBoxscoreTeam;
      };
    };
  };
}

// MLB team primary colors by team ID
const TEAM_COLORS: Record<number, string> = {
  133: '#003831', 109: '#A71930', 144: '#CE1141', 110: '#DF4601',
  111: '#BD3039', 112: '#0E3386', 145: '#27251F', 113: '#C6011F',
  114: '#00385D', 115: '#33006F', 116: '#0C2340', 117: '#EB6E1F',
  118: '#004687', 108: '#BA0021', 119: '#005A9C', 146: '#00A3E0',
  158: '#12284B', 142: '#002B5C', 121: '#002D72', 147: '#132448',
  143: '#E81828', 134: '#27251F', 135: '#2F241D', 137: '#FD5A1E',
  136: '#0C2C56', 138: '#C41E3A', 139: '#092C5C', 140: '#003278',
  141: '#134A8E', 120: '#14225A',
};

function parseBatters(team: MLBBoxscoreTeam): BatterLine[] {
  const order = team.batters ?? [];
  return order.map((id) => {
    const p = team.players[`ID${id}`];
    if (!p) return null;
    const b = p.stats.batting ?? {};
    return {
      id,
      name: p.person.fullName,
      position: p.position.abbreviation,
      atBats: b.atBats ?? 0,
      runs: b.runs ?? 0,
      hits: b.hits ?? 0,
      rbi: b.rbi ?? 0,
      bb: b.baseOnBalls ?? 0,
      so: b.strikeOuts ?? 0,
      avg: b.avg ?? '---',
    } satisfies BatterLine;
  }).filter(Boolean) as BatterLine[];
}

function parsePitchers(team: MLBBoxscoreTeam): PitcherLine[] {
  const order = team.pitchers ?? [];
  return order.map((id) => {
    const p = team.players[`ID${id}`];
    if (!p) return null;
    const pi = p.stats.pitching ?? {};
    return {
      id,
      name: p.person.fullName,
      ip: pi.inningsPitched ?? '0.0',
      hits: pi.hits ?? 0,
      runs: pi.runs ?? 0,
      er: pi.earnedRuns ?? 0,
      bb: pi.baseOnBalls ?? 0,
      so: pi.strikeOuts ?? 0,
      era: pi.era ?? '-.--',
      note: pi.note,
    } satisfies PitcherLine;
  }).filter(Boolean) as PitcherLine[];
}

function parsePlays(allPlays: MLBFullLiveFeed['liveData']['plays']['allPlays']): PlayEvent[] {
  return allPlays
    .filter((p) => p.about.isComplete)
    .map((p, i) => ({
      id: `${p.about.atBatIndex}-${i}`,
      inning: p.about.inning,
      half: p.about.isTopInning ? 'top' : 'bottom',
      event: p.result.event,
      description: p.result.description,
      rbi: p.result.rbi ?? 0,
      awayScore: p.result.awayScore ?? 0,
      homeScore: p.result.homeScore ?? 0,
    }));
}

interface MLBStandingsResponse {
  records: {
    division: { id: number; name: string; abbreviation: string };
    teamRecords: {
      team: { id: number; name: string; abbreviation?: string };
      wins: number;
      losses: number;
      winningPercentage: string;
      gamesBack: string;
      streak: { streakCode: string };
      records: {
        splitRecords: { type: string; wins: number; losses: number }[];
      };
    }[];
  }[];
}

// ── Status mapping ──────────────────────────────────────────────────

function mapStatus(status: MLBGame['status']): GameStatus {
  const code = status.statusCode;

  // Live states
  if (['I', 'MA', 'MB', 'MC'].includes(code)) return 'live';

  // Final states
  if (['F', 'FT', 'FR', 'FO', 'CR', 'GO'].includes(code)) return 'final';

  // Postponed
  if (['PO', 'PI', 'CO'].includes(code)) return 'postponed';

  // Delayed
  if (['DI', 'DR', 'DG'].includes(code)) return 'delayed';

  // Everything else is scheduled (S, P, PW, etc.)
  return 'scheduled';
}

function mapInningHalf(linescore: MLBLinescore): InningHalf | undefined {
  if (linescore.currentInning == null) return undefined;
  if (linescore.isTopInning === true) return 'top';
  if (linescore.isTopInning === false) return 'bottom';
  return undefined;
}

// ── Helpers ─────────────────────────────────────────────────────────

function parseTeam(t: MLBGameTeam['team']): Team {
  return {
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation ?? t.name.slice(0, 3).toUpperCase(),
    primaryColor: TEAM_COLORS[t.id],
  };
}

function parseLinescore(innings?: MLBLinescore['innings']): LinescoreInning[] | undefined {
  if (!innings?.length) return undefined;
  return innings.map((inn) => ({
    inning: inn.num,
    home: inn.home.runs ?? null,
    away: inn.away.runs ?? null,
  }));
}

function parseRunners(play: MLBLiveFeed['liveData']['plays']['currentPlay']): RunnersOn {
  const runners: RunnersOn = { first: false, second: false, third: false };
  if (!play?.runners) return runners;
  for (const r of play.runners) {
    const base = r.movement.end;
    if (r.movement.isOut) continue;
    if (base === '1B') runners.first = true;
    else if (base === '2B') runners.second = true;
    else if (base === '3B') runners.third = true;
  }
  return runners;
}

function toPlayer(p?: { id: number; fullName: string }): PlayerInfo | undefined {
  if (!p) return undefined;
  return { id: p.id, name: p.fullName };
}

async function mlbFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Generic schedule fetcher for any MLB Stats API sportId.
 * Reused by both mlb.ts (sportId=1) and milb.ts (sportId=11–14).
 * Response format is identical across all sport levels.
 */
export async function fetchScheduleGames(
  date: string,
  sportId: number,
  league: League,
): Promise<Game[]> {
  const cacheKey = `schedule:${sportId}:${date}`;
  const cached = gameCache.get<Game[]>(cacheKey);
  if (cached) return cached;

  const data = await mlbFetch<MLBScheduleResponse>(
    `${MLB_API}/schedule?sportId=${sportId}&date=${date}&hydrate=linescore,team`
  );

  if (!data.dates?.length) return [];

  const games: Game[] = [];

  for (const dateEntry of data.dates) {
    for (const g of dateEntry.games) {
      const status = mapStatus(g.status);
      const ls = g.linescore;

      const game: Game = {
        id: g.gamePk,
        league,
        status,
        scheduledTime: g.gameDate,
        homeTeam: parseTeam(g.teams.home.team),
        awayTeam: parseTeam(g.teams.away.team),
        homeScore: g.teams.home.score ?? 0,
        awayScore: g.teams.away.score ?? 0,
        currentInning: ls?.currentInning,
        inningHalf: ls ? mapInningHalf(ls) : undefined,
        outs: ls?.outs,
        linescore: parseLinescore(ls?.innings),
        homeHits: ls?.teams?.home.hits,
        awayHits: ls?.teams?.away.hits,
        homeErrors: ls?.teams?.home.errors,
        awayErrors: ls?.teams?.away.errors,
      };

      if (status === 'live') {
        try {
          await enrichLiveGame(game);
        } catch {
          // Live feed failed — game still usable with schedule data
        }
      }

      games.push(game);
    }
  }

  const hasLive = games.some((g) => g.status === 'live');
  // Live games: 30s TTL so scores refresh frequently.
  // No live games: 2-min TTL so we catch game start promptly (not 15min scheduleCache).
  gameCache.set(cacheKey, games, hasLive ? 30 : 120);

  return games;
}

/**
 * Fetch MLB games for a given date string (YYYY-MM-DD).
 */
export async function getMLBGames(date: string): Promise<Game[]> {
  return fetchScheduleGames(date, 1, MLB_LEAGUE);
}

/**
 * Fetch detailed live feed for a single game. Used to get count, runners,
 * current pitcher/batter. Cached for 30 seconds.
 */
export async function getMLBLiveFeed(gamePk: number): Promise<MLBLiveFeed> {
  const cacheKey = `mlb:live:${gamePk}`;
  const cached = gameCache.get<MLBLiveFeed>(cacheKey);
  if (cached) return cached;

  const data = await mlbFetch<MLBLiveFeed>(
    `${MLB_API_LIVE}/game/${gamePk}/feed/live`
  );

  gameCache.set(cacheKey, data);
  return data;
}

async function enrichLiveGame(game: Game): Promise<void> {
  const feed = await getMLBLiveFeed(game.id);
  const play = feed.liveData.plays.currentPlay;

  if (play) {
    game.count = {
      balls: play.count.balls,
      strikes: play.count.strikes,
      outs: play.count.outs,
    };
    game.runnersOn = parseRunners(play);
    game.currentBatter = toPlayer(play.matchup.batter);
    game.currentPitcher = toPlayer(play.matchup.pitcher);
  }

  // Update linescore/outs from live feed (more current than schedule hydrate)
  const ls = feed.liveData.linescore;
  game.currentInning = ls.currentInning;
  game.inningHalf = mapInningHalf(ls);
  game.outs = ls.outs;
  game.linescore = parseLinescore(ls.innings);
  game.homeHits = ls.teams?.home.hits;
  game.awayHits = ls.teams?.away.hits;
  game.homeErrors = ls.teams?.home.errors;
  game.awayErrors = ls.teams?.away.errors;
}

/**
 * Fetch MLB standings for a given season year.
 * Cached for 5 minutes.
 */
export async function getMLBStandings(season: number): Promise<Standing[]> {
  const cacheKey = `mlb:standings:${season}`;
  const cached = standingsCache.get<Standing[]>(cacheKey);
  if (cached) return cached;

  const data = await mlbFetch<MLBStandingsResponse>(
    `${MLB_API}/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=team,division`
  );

  const standings: Standing[] = [];

  for (const division of data.records) {
    for (const rec of division.teamRecords) {
      const last10 = rec.records.splitRecords.find((s) => s.type === 'lastTen');

      standings.push({
        team: {
          id: rec.team.id,
          name: rec.team.name,
          abbreviation: rec.team.abbreviation ?? rec.team.name.slice(0, 3).toUpperCase(),
          logoUrl: `https://www.mlbstatic.com/team-logos/${rec.team.id}.svg`,
        },
        division: division.division.name,
        wins: rec.wins,
        losses: rec.losses,
        pct: parseFloat(rec.winningPercentage),
        gamesBack: rec.gamesBack === '-' ? 0 : parseFloat(rec.gamesBack),
        streak: rec.streak.streakCode,
        last10: last10 ? `${last10.wins}-${last10.losses}` : '',
      });
    }
  }

  standingsCache.set(cacheKey, standings);
  return standings;
}

/**
 * Fetch full game detail for the game detail page.
 * Returns box score, play-by-play, and current live situation.
 * Cached 30s for live games, 5min for finished/scheduled.
 */
export async function getMLBGameDetail(gamePk: number): Promise<GameDetail> {
  const cacheKey = `mlb:detail:${gamePk}`;

  const feed = await mlbFetch<MLBFullLiveFeed>(
    `${MLB_API_LIVE}/game/${gamePk}/feed/live`
  );

  const { gameData, liveData } = feed;
  const status = mapStatus(gameData.status);
  const ls = liveData.linescore;
  const cp = liveData.plays.currentPlay;

  const homeTeam = parseTeam({
    id: gameData.teams.home.id,
    name: gameData.teams.home.name,
    abbreviation: gameData.teams.home.abbreviation,
  });
  const awayTeam = parseTeam({
    id: gameData.teams.away.id,
    name: gameData.teams.away.name,
    abbreviation: gameData.teams.away.abbreviation,
  });

  const detail: GameDetail = {
    id: gamePk,
    league: MLB_LEAGUE,
    status,
    scheduledTime: '',
    homeTeam,
    awayTeam,
    homeScore: ls.teams?.home.runs ?? 0,
    awayScore: ls.teams?.away.runs ?? 0,
    currentInning: ls.currentInning,
    inningHalf: mapInningHalf(ls),
    outs: ls.outs,
    linescore: parseLinescore(ls.innings),
    homeHits: ls.teams?.home.hits,
    awayHits: ls.teams?.away.hits,
    homeErrors: ls.teams?.home.errors,
    awayErrors: ls.teams?.away.errors,
    venue: gameData.venue?.name,
    homeColor: TEAM_COLORS[gameData.teams.home.id],
    awayColor: TEAM_COLORS[gameData.teams.away.id],
  };

  if (cp) {
    detail.count = {
      balls: cp.count.balls,
      strikes: cp.count.strikes,
      outs: cp.count.outs,
    };
    detail.runnersOn = parseRunners(cp);
    detail.currentBatter = toPlayer(cp.matchup.batter);
    detail.currentPitcher = toPlayer(cp.matchup.pitcher);
    detail.lastPlayDescription = cp.result.description;
    detail.lastPlayEvent = cp.result.event;
  }

  const bsTeams = liveData.boxscore.teams;
  detail.batting = {
    home: parseBatters(bsTeams.home),
    away: parseBatters(bsTeams.away),
  };
  detail.pitching = {
    home: parsePitchers(bsTeams.home),
    away: parsePitchers(bsTeams.away),
  };
  detail.plays = parsePlays(liveData.plays.allPlays);

  const ttl = status === 'live' ? 30 : 300;
  gameCache.set(cacheKey, detail, ttl);

  return detail;
}
