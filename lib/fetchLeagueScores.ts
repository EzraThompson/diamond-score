import type { LeagueGroup } from './buildScores';
import { getMLBGames } from './data-sources/mlb';
import { getKBOGames } from './data-sources/kbo';
import { getNPBGames } from './data-sources/npb';
import { getMiLBGames } from './data-sources/milb';
import { getNCAAGames } from './data-sources/ncaa';

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
