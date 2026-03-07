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
    return NextResponse.json({ leagues, hasLive: leagues.some((l) => l.games.some((g) => g.status === 'live')) });
  } catch {
    return NextResponse.json({ leagues: [], hasLive: false });
  }
}
