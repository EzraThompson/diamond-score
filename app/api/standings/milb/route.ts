import { NextRequest, NextResponse } from 'next/server';
import { getMiLBStandings, MILB_LEVELS } from '@/lib/data-sources/milb';
import type { Standing } from '@/lib/types';

export const revalidate = 300; // 5 minutes

function currentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 < 4 ? year - 1 : year;
}

export interface MiLBDivisionGroup {
  name: string;
  rows: Standing[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sportId = parseInt(searchParams.get('level') ?? '11', 10);
  const season = currentSeason();

  const level = MILB_LEVELS.find((l) => l.sportId === sportId);
  if (!level) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  try {
    const standings = await getMiLBStandings(sportId, season);

    // Group by division
    const divMap = new Map<string, Standing[]>();
    for (const row of standings) {
      if (!row.division) continue;
      const list = divMap.get(row.division) ?? [];
      list.push(row);
      divMap.set(row.division, list);
    }

    const divisions: MiLBDivisionGroup[] = [];
    for (const [name, rows] of Array.from(divMap)) {
      if (name) divisions.push({ name, rows });
    }

    return NextResponse.json({ season, level: level.label, sportId, divisions });
  } catch (err) {
    console.error('MiLB standings error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch MiLB standings' },
      { status: 500 }
    );
  }
}
