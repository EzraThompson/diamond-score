import { NextRequest, NextResponse } from 'next/server';
import { getMLBGameDetail } from '@/lib/data-sources/mlb';
import { getNCAAGameDetail } from '@/lib/data-sources/ncaa';
import { getNPBGameDetail, NPB_ID_MIN, NPB_ID_MAX } from '@/lib/data-sources/npb';
import { getKBOGameDetail, KBO_ID_MIN, KBO_ID_MAX } from '@/lib/data-sources/kbo';
import { getWBCGameDetail } from '@/lib/data-sources/wbc';

export const dynamic = 'force-dynamic';

// ESPN game IDs (NCAA) are 9-digit numbers in the 400M+ range.
// MLB gamePks are currently ~700K–800K and won't reach this threshold.
// WBC gamePks (from MLB Stats API, sportId=51) are in the same ~700K range as MLB,
// so they MUST be disambiguated via the ?league=20 query parameter.
// NPB IDs live in [2_000_000, 3_000_000) — checked first to avoid ambiguity.
const ESPN_ID_THRESHOLD = 400_000_000;

// WBC league ID as defined in buildScores / WBC_LEAGUE
const WBC_LEAGUE_ID = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gamePk = parseInt(params.id, 10);
  if (isNaN(gamePk)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  // A ?league= query param lets the client tell us which source to use.
  // This is required to distinguish WBC from NCAA — both use ESPN IDs in the
  // 400M+ range and cannot be differentiated by ID alone.
  const url = new URL(req.url);
  const leagueId = parseInt(url.searchParams.get('league') ?? '', 10) || null;

  try {
    let detail;
    if (leagueId === WBC_LEAGUE_ID) {
      detail = await getWBCGameDetail(gamePk);
    } else if (gamePk >= NPB_ID_MIN && gamePk < NPB_ID_MAX) {
      detail = await getNPBGameDetail(gamePk);
    } else if (gamePk >= KBO_ID_MIN && gamePk < KBO_ID_MAX) {
      detail = await getKBOGameDetail(gamePk);
    } else if (gamePk >= ESPN_ID_THRESHOLD) {
      detail = await getNCAAGameDetail(gamePk);
    } else {
      detail = await getMLBGameDetail(gamePk);
    }

    const cc = detail.status === 'live'
      ? 'public, s-maxage=5, stale-while-revalidate=10'
      : 'public, s-maxage=30, stale-while-revalidate=60';
    return NextResponse.json(detail, { headers: { 'Cache-Control': cc } });
  } catch (err) {
    console.error('Game detail API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch game data' },
      { status: 500 }
    );
  }
}
