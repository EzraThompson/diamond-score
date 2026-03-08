import { NextRequest, NextResponse } from 'next/server';
import { getMiLBGames } from '@/lib/data-sources/milb';
import type { LeagueGroup } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const levelGames = await getMiLBGames(date);
    const leagues: LeagueGroup[] = levelGames
      .filter(({ games }) => games.length > 0)
      .map(({ level, games }) => ({
        id: level.sportId, name: level.label, country: 'USA',
        games, defaultCollapsed: true, showTop25Filter: false,
      }));
    const hasLive = leagues.some((l) => l.games.some((g) => g.status === 'live'));
    const cc = hasLive ? 'public, s-maxage=5, stale-while-revalidate=10' : 'public, s-maxage=30, stale-while-revalidate=60';
    return NextResponse.json({ leagues, hasLive }, { headers: { 'Cache-Control': cc } });
  } catch {
    return NextResponse.json({ leagues: [], hasLive: false });
  }
}
