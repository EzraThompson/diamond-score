import { NextRequest, NextResponse } from 'next/server';
import { getNPBGames } from '@/lib/data-sources/npb';
import type { LeagueGroup } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const games = await getNPBGames(date);
    const leagues: LeagueGroup[] = games.length > 0
      ? [{ id: 2, name: 'NPB', country: 'Japan', logoUrl: '/logos/npb.svg',
           games, defaultCollapsed: true, showTop25Filter: false }]
      : [];
    return NextResponse.json({ leagues, hasLive: leagues.some((l) => l.games.some((g) => g.status === 'live')) });
  } catch {
    const errorLeague: LeagueGroup = {
      id: 2, name: 'NPB', country: 'Japan', logoUrl: '/logos/npb.svg',
      games: [], defaultCollapsed: true, showTop25Filter: false,
      error: 'Data temporarily unavailable',
    };
    return NextResponse.json({ leagues: [errorLeague], hasLive: false });
  }
}
