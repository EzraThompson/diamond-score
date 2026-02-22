/**
 * MiLB Data Source
 * Uses the same MLB Stats API with different sportId values.
 * Response format is identical — we reuse fetchScheduleGames from mlb.ts.
 *
 * sportId mapping:
 *   11 = Triple-A   12 = Double-A
 *   13 = High-A     14 = Single-A
 */

import { fetchScheduleGames } from './mlb';
import { standingsCache } from '../cache';
import type { Game, League, Standing } from '../types';

const MLB_API = 'https://statsapi.mlb.com/api/v1';

// ── Level definitions ────────────────────────────────────────────────

export interface MiLBLevel {
  sportId: number;
  label: string;       // display name
  abbr: string;        // short label for header badge
  leagueIds: number[]; // for standings API (leagueId param)
  league: League;
}

export const MILB_LEVELS: MiLBLevel[] = [
  {
    sportId: 11,
    label: 'Triple-A',
    abbr: 'AAA',
    // International League (117) + Pacific Coast League (112)
    leagueIds: [117, 112],
    league: { id: 11, name: 'Triple-A', country: 'USA' },
  },
  {
    sportId: 12,
    label: 'Double-A',
    abbr: 'AA',
    // Eastern League (113), Southern League (111), Texas League (109)
    leagueIds: [113, 111, 109],
    league: { id: 12, name: 'Double-A', country: 'USA' },
  },
  {
    sportId: 13,
    label: 'High-A',
    abbr: 'A+',
    // South Atlantic League (116), Midwest League (118), Northwest League (126)
    leagueIds: [116, 118, 126],
    league: { id: 13, name: 'High-A', country: 'USA' },
  },
  {
    sportId: 14,
    label: 'Single-A',
    abbr: 'A',
    // Carolina League (122), Florida State League (123), California League (110)
    leagueIds: [122, 123, 110],
    league: { id: 14, name: 'Single-A', country: 'USA' },
  },
];

// ── Schedules ────────────────────────────────────────────────────────

/**
 * Fetch games for all 4 MiLB levels in parallel.
 * Returns only levels that have games on the given date.
 */
export async function getMiLBGames(
  date: string,
): Promise<{ level: MiLBLevel; games: Game[] }[]> {
  const results = await Promise.allSettled(
    MILB_LEVELS.map((level) =>
      fetchScheduleGames(date, level.sportId, level.league).then((games) => ({
        level,
        games,
      }))
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ level: MiLBLevel; games: Game[] }> =>
        r.status === 'fulfilled' && r.value.games.length > 0
    )
    .map((r) => r.value);
}

// ── Standings ────────────────────────────────────────────────────────

interface MLBStandingsRecord {
  division?: { id: number; name: string };
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
}

/**
 * Fetch MiLB standings for a given sport level and season.
 * Uses leagueId params since the standings endpoint doesn't support sportId directly.
 * Cached 5 minutes.
 */
export async function getMiLBStandings(
  sportId: number,
  season: number,
): Promise<Standing[]> {
  const cacheKey = `milb:standings:${sportId}:${season}`;
  const cached = standingsCache.get<Standing[]>(cacheKey);
  if (cached) return cached;

  const level = MILB_LEVELS.find((l) => l.sportId === sportId);
  if (!level) return [];

  const leagueIdStr = level.leagueIds.join(',');

  const res = await fetch(
    `${MLB_API}/standings?leagueId=${leagueIdStr}&season=${season}&standingsTypes=regularSeason&hydrate=team,division`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`MiLB standings API ${res.status}`);

  const data = await res.json() as { records: MLBStandingsRecord[] };

  const standings: Standing[] = [];

  for (const record of data.records ?? []) {
    if (!record.division?.name) continue;
    for (const rec of record.teamRecords) {
      const last10 = rec.records?.splitRecords?.find((s) => s.type === 'lastTen');
      standings.push({
        team: {
          id: rec.team.id,
          name: rec.team.name,
          abbreviation: rec.team.abbreviation ?? rec.team.name.slice(0, 3).toUpperCase(),
          logoUrl: `https://www.mlbstatic.com/team-logos/${rec.team.id}.svg`,
        },
        division: record.division.name,
        wins: rec.wins,
        losses: rec.losses,
        pct: parseFloat(rec.winningPercentage),
        gamesBack: rec.gamesBack === '-' ? 0 : parseFloat(rec.gamesBack),
        streak: rec.streak?.streakCode ?? '',
        last10: last10 ? `${last10.wins}-${last10.losses}` : '',
      });
    }
  }

  standingsCache.set(cacheKey, standings);
  return standings;
}
