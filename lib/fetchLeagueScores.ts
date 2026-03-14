import type { LeagueGroup } from './buildScores';
import { getMLBGames } from './data-sources/mlb';
import { getKBOGames } from './data-sources/kbo';
import { getNPBGames } from './data-sources/npb';
import { getMiLBGames } from './data-sources/milb';
import { getNCAAGames } from './data-sources/ncaa';
import { getWBCGames } from './data-sources/wbc';

const LEAGUE_SLUGS = ['wbc', 'mlb', 'milb', 'npb', 'kbo', 'ncaa'] as const;

/**
 * Fetch scores for all leagues in parallel (for homepage SSR).
 * Returns a map of slot key → LeagueGroup[].
 */
export async function fetchAllLeagueScores(
  date?: string,
): Promise<Record<string, LeagueGroup[]>> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const results = await Promise.all(
    LEAGUE_SLUGS.map(async (slug) => {
      const leagues = slug === 'wbc'
        ? await fetchWBCScores(d)
        : await fetchLeagueScores(slug, d);
      return [slug, leagues] as const;
    }),
  );
  return Object.fromEntries(results);
}

async function fetchWBCScores(date: string): Promise<LeagueGroup[]> {
  try {
    const games = await getWBCGames(date);
    return games.length > 0
      ? [{ id: 20, name: 'World Baseball Classic', abbr: 'WBC', country: 'International', logoUrl: '/logos/wbc.svg', games, defaultCollapsed: true, showTop25Filter: false }]
      : [];
  } catch {
    return [];
  }
}

/**
 * Server-side score fetching for ISR league pages.
 * Mirrors the logic in each /api/scores/[league] route handler.
 */
export async function fetchLeagueScores(
  slug: string,
  date?: string,
): Promise<LeagueGroup[]> {
  const d = date ?? new Date().toISOString().slice(0, 10);

  try {
    switch (slug) {
      case 'mlb': {
        const games = await getMLBGames(d);
        return games.length > 0
          ? [{ id: 1, name: 'MLB', country: 'USA', logoUrl: '/logos/mlb.svg', games, defaultCollapsed: true, showTop25Filter: false }]
          : [];
      }
      case 'kbo': {
        const games = await getKBOGames(d);
        return games.length > 0
          ? [{ id: 3, name: 'KBO', country: 'South Korea', logoUrl: '/logos/kbo.svg', games, defaultCollapsed: true, showTop25Filter: false }]
          : [];
      }
      case 'npb': {
        const games = await getNPBGames(d);
        return games.length > 0
          ? [{ id: 2, name: 'NPB', country: 'Japan', logoUrl: '/logos/npb.svg', games, defaultCollapsed: true, showTop25Filter: false }]
          : [];
      }
      case 'milb': {
        const levelGames = await getMiLBGames(d);
        return levelGames
          .filter(({ games }) => games.length > 0)
          .map(({ level, games }) => ({
            id: level.sportId, name: level.label, country: 'USA',
            games, defaultCollapsed: true, showTop25Filter: false,
          }));
      }
      case 'ncaa': {
        const games = await getNCAAGames(d);
        return games.length > 0
          ? [{ id: 16, name: 'College Baseball', country: 'USA', games, defaultCollapsed: true, showTop25Filter: true }]
          : [];
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}
