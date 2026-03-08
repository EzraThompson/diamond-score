/**
 * WBC (World Baseball Classic) Data Source
 *
 * Uses the MLB Stats API (statsapi.mlb.com) with sportId=51 for WBC games.
 * The response format is identical to MLB/MiLB, so we reuse fetchScheduleGames
 * and fetchGameDetailFromLiveFeed from mlb.ts.
 *
 * WBC is a multi-round international tournament. Team abbreviations use
 * IOC/WBSC country codes (USA, JPN, DOM, etc.) with a few remaps needed.
 */

import { gameCache } from '../cache';
import { fetchScheduleGames, fetchGameDetailFromLiveFeed } from './mlb';
import type { Game, GameDetail, GameStatus, League } from '../types';

// ── Constants ────────────────────────────────────────────────────────

const WBC_SPORT_ID = 51;

export const WBC_LEAGUE: League = {
  id: 20,
  name: 'World Baseball Classic',
  country: 'International',
};

// MLB Stats API uses different abbreviations for some WBC teams than our registry.
// Map MLB API abbreviation → registry abbreviation.
export const WBC_ABBR_MAP: Record<string, string> = {
  COL: 'CLM', // Colombia — COL conflicts with MLB Colorado Rockies
  PUR: 'PRI', // Puerto Rico — MLB API uses PUR, registry uses PRI
};

// WBC team primary colors keyed by MLB Stats API team ID.
// Values sourced from lib/teamRegistry.ts WBC entries.
export const WBC_TEAM_COLORS: Record<number, string> = {
  940: '#002868', // USA
  843: '#BC002D', // JPN
  867: '#006847', // MEX
  798: '#003087', // CUB
  944: '#CF142B', // VEN
  897: '#ED0C2D', // PUR (Puerto Rico)
  805: '#002D62', // DOM
  792: '#FCD116', // COL (Colombia)
  784: '#FF0000', // CAN
  840: '#003087', // ISR
  841: '#009246', // ITA
  760: '#00843D', // AUS
  791: '#003580', // TPE
  800: '#11457E', // CZE
  1171: '#CD2E3A', // KOR
  878: '#FF4B00', // NED
  890: '#DA121A', // PAN
};

const STATUS_ORDER: Record<GameStatus, number> = {
  live: 0,
  final: 1,
  scheduled: 2,
  postponed: 3,
  delayed: 3,
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Apply WBC-specific post-processing to a game from fetchScheduleGames. */
function enrichWBCGame(game: Game): void {
  // Remap abbreviations
  const homeAbbr = WBC_ABBR_MAP[game.homeTeam.abbreviation];
  if (homeAbbr) game.homeTeam.abbreviation = homeAbbr;
  const awayAbbr = WBC_ABBR_MAP[game.awayTeam.abbreviation];
  if (awayAbbr) game.awayTeam.abbreviation = awayAbbr;

  // Inject colors from WBC-specific map (overrides any default from mlb.ts TEAM_COLORS)
  game.homeTeam.primaryColor = WBC_TEAM_COLORS[game.homeTeam.id] ?? game.homeTeam.primaryColor;
  game.awayTeam.primaryColor = WBC_TEAM_COLORS[game.awayTeam.id] ?? game.awayTeam.primaryColor;

  // Inject logo URLs from mlbstatic CDN
  game.homeTeam.logoUrl = `https://www.mlbstatic.com/team-logos/${game.homeTeam.id}.svg`;
  game.awayTeam.logoUrl = `https://www.mlbstatic.com/team-logos/${game.awayTeam.id}.svg`;
}

/** Apply WBC-specific post-processing to a GameDetail. */
function enrichWBCDetail(detail: GameDetail): void {
  const homeAbbr = WBC_ABBR_MAP[detail.homeTeam.abbreviation];
  if (homeAbbr) detail.homeTeam.abbreviation = homeAbbr;
  const awayAbbr = WBC_ABBR_MAP[detail.awayTeam.abbreviation];
  if (awayAbbr) detail.awayTeam.abbreviation = awayAbbr;

  detail.homeTeam.primaryColor = WBC_TEAM_COLORS[detail.homeTeam.id] ?? detail.homeTeam.primaryColor;
  detail.awayTeam.primaryColor = WBC_TEAM_COLORS[detail.awayTeam.id] ?? detail.awayTeam.primaryColor;

  detail.homeTeam.logoUrl = `https://www.mlbstatic.com/team-logos/${detail.homeTeam.id}.svg`;
  detail.awayTeam.logoUrl = `https://www.mlbstatic.com/team-logos/${detail.awayTeam.id}.svg`;

  detail.homeColor = detail.homeTeam.primaryColor;
  detail.awayColor = detail.awayTeam.primaryColor;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Fetch WBC games for a given date (YYYY-MM-DD).
 * Uses the MLB Stats API with sportId=51 — same format as MLB/MiLB.
 * Returns all games sorted live → final → scheduled.
 */
export async function getWBCGames(date: string): Promise<Game[]> {
  const games = await fetchScheduleGames(date, WBC_SPORT_ID, WBC_LEAGUE);

  for (const game of games) {
    enrichWBCGame(game);
  }

  games.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return games;
}

/**
 * Fetch full game detail for a WBC game.
 * Uses the MLB Stats API live feed — provides boxscore, play-by-play, and
 * live situation data (runners, count, batter/pitcher).
 * Cached 30s for live games, 5min for finished/scheduled.
 */
export async function getWBCGameDetail(gamePk: number): Promise<GameDetail> {
  const cacheKey = `wbc:detail:${gamePk}`;
  const cached = gameCache.get<GameDetail>(cacheKey);
  if (cached) return cached;

  const detail = await fetchGameDetailFromLiveFeed(gamePk, WBC_LEAGUE, WBC_TEAM_COLORS);
  enrichWBCDetail(detail);

  const ttl = detail.status === 'live' ? 4 : 300;
  gameCache.set(cacheKey, detail, ttl);

  return detail;
}
