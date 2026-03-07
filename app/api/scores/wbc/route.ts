import { NextRequest, NextResponse } from 'next/server';
import { getWBCGames } from '@/lib/data-sources/wbc';
import type { LeagueGroup } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const games = await getWBCGames(date);
    const leagues: LeagueGroup[] = games.length > 0
      ? [{ id: 20, name: 'World Baseball Classic', abbr: 'WBC', country: 'International',
           games, defaultCollapsed: true, showTop25Filter: false }]
      : [];
    return NextResponse.json({ leagues, hasLive: leagues.some((l) => l.games.some((g) => g.status === 'live')) });
  } catch {
    return NextResponse.json({ leagues: [], hasLive: false });
  }
}
