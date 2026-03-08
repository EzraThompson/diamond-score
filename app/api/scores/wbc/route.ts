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
    const hasLive = leagues.some((l) => l.games.some((g) => g.status === 'live'));
    const cc = hasLive ? 'public, s-maxage=5, stale-while-revalidate=10' : 'public, s-maxage=30, stale-while-revalidate=60';
    return NextResponse.json({ leagues, hasLive }, { headers: { 'Cache-Control': cc } });
  } catch {
    return NextResponse.json({ leagues: [], hasLive: false });
  }
}
