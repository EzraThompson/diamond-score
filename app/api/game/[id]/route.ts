import { NextRequest, NextResponse } from 'next/server';
import { getMLBGameDetail } from '@/lib/data-sources/mlb';
import { getNCAAGameDetail } from '@/lib/data-sources/ncaa';
import { getNPBGameDetail, NPB_ID_MIN, NPB_ID_MAX } from '@/lib/data-sources/npb';
import { getKBOGameDetail, KBO_ID_MIN, KBO_ID_MAX } from '@/lib/data-sources/kbo';

export const dynamic = 'force-dynamic';

// ESPN game IDs are 9-digit numbers in the 400M+ range.
// MLB gamePks are currently ~700K–800K and won't reach this threshold.
// NPB IDs live in [2_000_000, 3_000_000) — checked first to avoid ambiguity.
const ESPN_ID_THRESHOLD = 400_000_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gamePk = parseInt(params.id, 10);
  if (isNaN(gamePk)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  try {
    let detail;
    if (gamePk >= NPB_ID_MIN && gamePk < NPB_ID_MAX) {
      detail = await getNPBGameDetail(gamePk);
    } else if (gamePk >= KBO_ID_MIN && gamePk < KBO_ID_MAX) {
      detail = await getKBOGameDetail(gamePk);
    } else if (gamePk >= ESPN_ID_THRESHOLD) {
      detail = await getNCAAGameDetail(gamePk);
    } else {
      detail = await getMLBGameDetail(gamePk);
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error('Game detail API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch game data' },
      { status: 500 }
    );
  }
}
