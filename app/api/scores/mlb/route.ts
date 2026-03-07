import { NextRequest, NextResponse } from 'next/server';
import { getMLBGames } from '@/lib/data-sources/mlb';
import type { LeagueGroup } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const games = await getMLBGames(date);
    const leagues: LeagueGroup[] = games.length > 0
      ? [{ id: 1, name: 'MLB', country: 'USA', logoUrl: '/logos/mlb.svg',
           games, defaultCollapsed: true, showTop25Filter: false }]
      : [];
    return NextResponse.json({ leagues, hasLive: games.some((g) => g.status === 'live') });
  } catch {
    const errorLeague: LeagueGroup = {
      id: 1, name: 'MLB', country: 'USA', logoUrl: '/logos/mlb.svg',
      games: [], defaultCollapsed: true, showTop25Filter: false,
      error: 'Data temporarily unavailable',
    };
    return NextResponse.json({ leagues: [errorLeague], hasLive: false });
  }
}
