import { getMLBGames } from './data-sources/mlb';
import { getMiLBGames } from './data-sources/milb';
import { getNCAAGames } from './data-sources/ncaa';
import { getNPBGames } from './data-sources/npb';
import { getKBOGames } from './data-sources/kbo';
import type { Game } from './types';

export interface LeagueGroup {
  id: number;
  name: string;
  country: string;
  logoUrl?: string;
  games: Game[];
  defaultCollapsed: boolean;
  showTop25Filter: boolean;
}

export interface ScoresResult {
  date: string;
  leagues: LeagueGroup[];
  hasLive: boolean;
}

export async function buildScores(date: string): Promise<ScoresResult> {
  const [mlbGames, milbGroups, ncaaGames, npbGames, kboGames] = await Promise.all([
    getMLBGames(date),
    getMiLBGames(date).catch(() => []),
    getNCAAGames(date).catch(() => []),
    getNPBGames(date).catch(() => []),
    getKBOGames(date).catch(() => []),
  ]);

  const leagues: LeagueGroup[] = [];

  if (mlbGames.length > 0) {
    leagues.push({
      id: 1,
      name: 'MLB',
      country: 'USA',
      logoUrl: '/logos/mlb.svg',
      games: mlbGames,
      defaultCollapsed: true,
      showTop25Filter: false,
    });
  }

  for (const { level, games } of milbGroups) {
    leagues.push({
      id: level.sportId,
      name: level.label,
      country: 'USA',
      logoUrl: undefined,
      games,
      defaultCollapsed: true,
      showTop25Filter: false,
    });
  }

  if (npbGames.length > 0) {
    leagues.push({
      id: 2,
      name: 'NPB',
      country: 'Japan',
      logoUrl: '/logos/npb.svg',
      games: npbGames,
      defaultCollapsed: false,
      showTop25Filter: false,
    });
  }

  if (kboGames.length > 0) {
    leagues.push({
      id: 3,
      name: 'KBO',
      country: 'South Korea',
      logoUrl: '/logos/kbo.svg',
      games: kboGames,
      defaultCollapsed: false,
      showTop25Filter: false,
    });
  }

  if (ncaaGames.length > 0) {
    leagues.push({
      id: 16,
      name: 'College Baseball',
      country: 'USA',
      logoUrl: undefined,
      games: ncaaGames,
      defaultCollapsed: true,
      showTop25Filter: true,
    });
  }

  const hasLive = leagues.some((l) => l.games.some((g) => g.status === 'live'));

  return { date, leagues, hasLive };
}
