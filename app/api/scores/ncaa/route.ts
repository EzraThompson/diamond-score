import { NextRequest, NextResponse } from 'next/server';
import { getNCAAGames } from '@/lib/data-sources/ncaa';
import type { LeagueGroup } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const games = await getNCAAGames(date);
    const leagues: LeagueGroup[] = games.length > 0
      ? [{ id: 16, name: 'College Baseball', country: 'USA',
           games, defaultCollapsed: true, showTop25Filter: true }]
      : [];
    return NextResponse.json({ leagues, hasLive: leagues.some((l) => l.games.some((g) => g.status === 'live')) });
  } catch {
    return NextResponse.json({ leagues: [], hasLive: false });
  }
}
