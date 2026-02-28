/**
 * WBC (World Baseball Classic) Data Source
 *
 * Uses ESPN's public scoreboard API for WBC games.
 * API: https://site.api.espn.com/apis/site/v2/sports/baseball/wbc/scoreboard
 *
 * WBC is a multi-round international tournament. Team abbreviations in ESPN's
 * API use IOC/WBSC country codes (USA, JPN, DOM, etc.).
 */

import { gameCache } from '../cache';
import { logger } from '../logger';
import { withRetry } from '../retry';
import type {
  Game,
  GameStatus,
  InningHalf,
  League,
  LinescoreInning,
  RunnersOn,
  Team,
} from '../types';

// ── Constants ────────────────────────────────────────────────────────

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/baseball/wbc';

// ESPN uses different abbreviations for some WBC teams than our registry.
// Map ESPN abbreviation → registry abbreviation.
const ESPN_ABBR_MAP: Record<string, string> = {
  COL: 'CLM', // Colombia — COL conflicts with MLB Colorado Rockies
};

export const WBC_LEAGUE: League = {
  id: 20,
  name: 'World Baseball Classic',
  country: 'International',
};

// ── ESPN API response types ──────────────────────────────────────────

interface ESPNScoreboard {
  events?: ESPNEvent[];
}

interface ESPNEvent {
  id: string;
  competitions: ESPNCompetition[];
  status: ESPNStatus;
}

interface ESPNCompetition {
  startDate: string;
  competitors: ESPNCompetitor[];
  status: ESPNStatus;
  situation?: ESPNSituation;
  notes?: { type: string; headline?: string }[];
}

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    color?: string;
    logo?: string;
  };
  score?: string;
  linescores?: { value: number; period: number }[];
  records?: { name: string; summary: string }[];
  hits?: number;
  errors?: number;
}

interface ESPNStatus {
  period: number;
  type: {
    name: string;
    state: string;
    detail: string;
  };
}

interface ESPNSituation {
  balls?: number;
  strikes?: number;
  outs?: number;
  onFirst?: object | boolean | null;
  onSecond?: object | boolean | null;
  onThird?: object | boolean | null;
}

// ── Mapping helpers ──────────────────────────────────────────────────

function mapStatus(typeName: string, state: string): GameStatus {
  if (typeName === 'STATUS_POSTPONED' || typeName === 'STATUS_CANCELED' || typeName === 'STATUS_SUSPENDED') {
    return 'postponed';
  }
  if (typeName === 'STATUS_DELAYED') return 'delayed';
  if (state === 'in') return 'live';
  if (state === 'post') return 'final';
  return 'scheduled';
}

function mapInningHalf(detail: string): InningHalf | undefined {
  const lower = detail.toLowerCase();
  if (lower.startsWith('top')) return 'top';
  if (lower.startsWith('bot')) return 'bottom';
  if (lower.startsWith('mid')) return 'mid';
  if (lower.startsWith('end')) return 'end';
  return undefined;
}

function parseRecord(records?: { name: string; summary: string }[]): { wins?: number; losses?: number } {
  if (!records?.length) return {};
  const entry =
    records.find((r) => r.name === 'overall') ??
    records.find((r) => r.name === 'total') ??
    records[0];
  if (!entry?.summary) return {};
  const match = entry.summary.match(/^(\d+)-(\d+)/);
  if (!match) return {};
  return { wins: parseInt(match[1], 10), losses: parseInt(match[2], 10) };
}

function parseTeam(c: ESPNCompetitor): Team {
  const abbreviation = ESPN_ABBR_MAP[c.team.abbreviation] ?? c.team.abbreviation;
  return {
    id: parseInt(c.team.id),
    name: c.team.displayName,
    abbreviation,
    logoUrl: c.team.logo,
    primaryColor: c.team.color ? `#${c.team.color}` : undefined,
    ...parseRecord(c.records),
  };
}

function parseLinescore(
  home: ESPNCompetitor,
  away: ESPNCompetitor,
): LinescoreInning[] | undefined {
  const homeLs = home.linescores ?? [];
  const awayLs = away.linescores ?? [];
  if (!homeLs.length && !awayLs.length) return undefined;

  const maxPeriod = Math.max(
    ...homeLs.map((l) => l.period),
    ...awayLs.map((l) => l.period),
    0,
  );
  if (maxPeriod === 0) return undefined;

  const homeByPeriod: Record<number, number> = Object.fromEntries(
    homeLs.map((l) => [l.period, l.value]),
  );
  const awayByPeriod: Record<number, number> = Object.fromEntries(
    awayLs.map((l) => [l.period, l.value]),
  );

  const innings: LinescoreInning[] = [];
  for (let i = 1; i <= maxPeriod; i++) {
    innings.push({
      inning: i,
      home: homeByPeriod[i] ?? null,
      away: awayByPeriod[i] ?? null,
    });
  }
  return innings;
}

function parseRunners(situation?: ESPNSituation): RunnersOn | undefined {
  if (!situation) return undefined;
  return {
    first: !!situation.onFirst,
    second: !!situation.onSecond,
    third: !!situation.onThird,
  };
}

const STATUS_ORDER: Record<GameStatus, number> = {
  live: 0,
  final: 1,
  scheduled: 2,
  postponed: 3,
  delayed: 3,
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Fetch WBC games for a given date (YYYY-MM-DD).
 * Returns all games sorted live → final → scheduled.
 * Returns an empty array (not an error) when no WBC games are scheduled.
 */
export async function getWBCGames(date: string): Promise<Game[]> {
  const cacheKey = `wbc:${date}`;
  const cached = gameCache.get<Game[]>(cacheKey);
  if (cached) return cached;

  const espnDate = date.replace(/-/g, '');
  const scoreboardUrl = `${ESPN_BASE}/scoreboard?dates=${espnDate}&limit=100`;

  const res = await withRetry(
    async () => {
      const done = logger.timed('wbc', scoreboardUrl);
      const r = await fetch(scoreboardUrl, { cache: 'no-store' });
      done({ status: r.status, error: r.ok ? undefined : `HTTP ${r.status}` });
      if (!r.ok) throw new Error(`ESPN WBC API ${r.status}`);
      return r;
    },
    { retries: 2, baseDelayMs: 500, source: 'wbc', label: 'scoreboard' },
  );

  const data = (await res.json()) as ESPNScoreboard;
  const events = data.events ?? [];

  const games: Game[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const status = mapStatus(event.status.type.name, event.status.type.state);
    const isLive = status === 'live';

    const game: Game = {
      id: parseInt(event.id),
      league: WBC_LEAGUE,
      status,
      scheduledTime: comp.startDate,
      homeTeam: parseTeam(home),
      awayTeam: parseTeam(away),
      homeScore: parseInt(home.score ?? '0') || 0,
      awayScore: parseInt(away.score ?? '0') || 0,
      currentInning: isLive ? event.status.period : undefined,
      inningHalf: isLive ? mapInningHalf(event.status.type.detail) : undefined,
      linescore: parseLinescore(home, away),
      homeHits: home.hits,
      awayHits: away.hits,
      homeErrors: home.errors,
      awayErrors: away.errors,
    };

    if (isLive && comp.situation) {
      const sit = comp.situation;
      game.runnersOn = parseRunners(sit);
      if (sit.outs !== undefined || sit.balls !== undefined || sit.strikes !== undefined) {
        const outs = sit.outs ?? 0;
        game.outs = outs;
        game.count = {
          balls: sit.balls ?? 0,
          strikes: sit.strikes ?? 0,
          outs,
        };
      }
    }

    games.push(game);
  }

  games.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const hasLive = games.some((g) => g.status === 'live');
  gameCache.set(cacheKey, games, hasLive ? 30 : 120);

  return games;
}
