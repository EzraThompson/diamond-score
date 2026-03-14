import type { Game } from './types';

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export interface LeagueSEOConfig {
  slug: string;
  name: string;
  fullName: string;
  country: string;
  h1: string;
  description: string;
  metaDescription: string;
  teamNames: string;
  slots: { key: string; endpoint: string; skeletonName: string; skeletonCount: number }[];
}

/** Generate SportsOrganization JSON-LD for a league page */
export function leagueJsonLd(league: LeagueSEOConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: `${league.fullName} (${league.name})`,
    sport: 'Baseball',
    location: {
      '@type': 'Country',
      name: league.country,
    },
    url: `${SITE_URL}/${league.slug}`,
  };
}

/** Format today's date for page titles (e.g. "March 14, 2026") */
export function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Generate SportsEvent JSON-LD array from a list of games */
export function gamesJsonLd(games: Game[]) {
  return games.map((g) => ({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${g.awayTeam.name ?? g.awayTeam.abbreviation} at ${g.homeTeam.name ?? g.homeTeam.abbreviation}`,
    sport: 'Baseball',
    startDate: g.scheduledTime,
    homeTeam: { '@type': 'SportsTeam', name: g.homeTeam.name ?? g.homeTeam.abbreviation },
    awayTeam: { '@type': 'SportsTeam', name: g.awayTeam.name ?? g.awayTeam.abbreviation },
  }));
}

export const LEAGUE_SEO: Record<string, LeagueSEOConfig> = {
  mlb: {
    slug: 'mlb',
    name: 'MLB',
    fullName: 'Major League Baseball',
    country: 'USA',
    h1: 'MLB Scores — Major League Baseball Live Results',
    description:
      'Live MLB scores, standings, and results from Major League Baseball. Follow all 30 teams across the American League and National League including the Yankees, Dodgers, Astros, Braves, Phillies, Red Sox, Cubs, Mets, Padres, Giants, Cardinals, Guardians, Orioles, Rangers, Twins, Mariners, Brewers, Diamondbacks, Rays, Royals, Tigers, Reds, Pirates, Marlins, White Sox, Angels, Rockies, Athletics, Nationals, and Blue Jays.',
    metaDescription:
      'Live MLB scores, box scores, and standings. Real-time results from all 30 Major League Baseball teams. Free, fast, and updated every 15 seconds.',
    teamNames:
      'Yankees, Dodgers, Astros, Braves, Phillies, Red Sox, Cubs, Mets, Padres, Giants, Cardinals, Guardians, Orioles, Rangers, Twins, Mariners, Brewers, Diamondbacks, Rays, Royals, Tigers, Reds, Pirates, Marlins, White Sox, Angels, Rockies, Athletics, Nationals, Blue Jays',
    slots: [{ key: 'mlb', endpoint: '/api/scores/mlb', skeletonName: 'MLB', skeletonCount: 4 }],
  },
  npb: {
    slug: 'npb',
    name: 'NPB',
    fullName: 'Nippon Professional Baseball',
    country: 'Japan',
    h1: 'NPB Scores — Nippon Professional Baseball Live Results',
    description:
      'Live NPB scores, standings, and results from Nippon Professional Baseball in Japan. Follow all 12 teams in the Central League (Yomiuri Giants, Hanshin Tigers, Yokohama DeNA BayStars, Hiroshima Carp, Chunichi Dragons, Tokyo Yakult Swallows) and Pacific League (Fukuoka SoftBank Hawks, Orix Buffaloes, Tohoku Rakuten Eagles, Saitama Seibu Lions, Chiba Lotte Marines, Hokkaido Nippon-Ham Fighters).',
    metaDescription:
      'Live NPB scores and standings from Japanese baseball. Real-time results from all 12 Nippon Professional Baseball teams in the Central and Pacific Leagues.',
    teamNames:
      'Yomiuri Giants, Hanshin Tigers, DeNA BayStars, Hiroshima Carp, Chunichi Dragons, Yakult Swallows, SoftBank Hawks, Orix Buffaloes, Rakuten Eagles, Seibu Lions, Lotte Marines, Nippon-Ham Fighters',
    slots: [{ key: 'npb', endpoint: '/api/scores/npb', skeletonName: 'NPB', skeletonCount: 3 }],
  },
  kbo: {
    slug: 'kbo',
    name: 'KBO',
    fullName: 'Korean Baseball Organization',
    country: 'South Korea',
    h1: 'KBO Scores — Korean Baseball Organization Live Results',
    description:
      'Live KBO scores, standings, and results from the Korean Baseball Organization. Follow all 10 teams: Samsung Lions, KIA Tigers, LG Twins, Lotte Giants, Doosan Bears, SSG Landers, NC Dinos, Kiwoom Heroes, Hanwha Eagles, and KT Wiz.',
    metaDescription:
      'Live KBO scores and standings from Korean baseball. Real-time results from all 10 Korean Baseball Organization teams including Samsung Lions, KIA Tigers, LG Twins, and more.',
    teamNames:
      'Samsung Lions, KIA Tigers, LG Twins, Lotte Giants, Doosan Bears, SSG Landers, NC Dinos, Kiwoom Heroes, Hanwha Eagles, KT Wiz',
    slots: [{ key: 'kbo', endpoint: '/api/scores/kbo', skeletonName: 'KBO', skeletonCount: 3 }],
  },
  milb: {
    slug: 'milb',
    name: 'MiLB',
    fullName: 'Minor League Baseball',
    country: 'USA',
    h1: 'MiLB Scores — Minor League Baseball Live Results',
    description:
      'Live Minor League Baseball scores and results from Triple-A, Double-A, High-A, and Single-A leagues. Track top prospects and farm systems across all MiLB affiliates.',
    metaDescription:
      'Live MiLB scores from Triple-A, Double-A, High-A, and Single-A. Track Minor League Baseball results and top prospects in real time.',
    teamNames: 'Triple-A, Double-A, High-A, Single-A affiliates',
    slots: [{ key: 'milb', endpoint: '/api/scores/milb', skeletonName: 'MiLB', skeletonCount: 3 }],
  },
  ncaa: {
    slug: 'ncaa',
    name: 'NCAA',
    fullName: 'NCAA College Baseball',
    country: 'USA',
    h1: 'College Baseball Scores — NCAA Division I Live Results',
    description:
      'Live college baseball scores and results from NCAA Division I. Follow top-25 ranked teams, conference matchups, and the road to the College World Series in Omaha.',
    metaDescription:
      'Live NCAA college baseball scores and results. Real-time Division I scores, top-25 rankings, and College World Series coverage.',
    teamNames: 'NCAA Division I college baseball teams',
    slots: [{ key: 'ncaa', endpoint: '/api/scores/ncaa', skeletonName: 'College Baseball', skeletonCount: 3 }],
  },
};
