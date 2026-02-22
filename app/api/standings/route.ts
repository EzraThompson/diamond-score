import { NextResponse } from 'next/server';
import { getMLBStandings } from '@/lib/data-sources/mlb';
import type { Standing } from '@/lib/types';

export const dynamic = 'force-dynamic';

// MLB season typically runs April–October.
// In the offseason, return the most recent completed season.
function currentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  // Before April → last year's standings are the most recent complete season
  return month < 4 ? year - 1 : year;
}

export interface DivisionGroup {
  name: string;
  rows: Standing[];
}

export async function GET() {
  try {
    const season = currentSeason();
    const standings = await getMLBStandings(season);

    // Group by division
    const divMap = new Map<string, Standing[]>();
    for (const row of standings) {
      const list = divMap.get(row.division) ?? [];
      list.push(row);
      divMap.set(row.division, list);
    }

    // Sort divisions in a consistent order
    const DIVISION_ORDER = [
      'American League East',
      'American League Central',
      'American League West',
      'National League East',
      'National League Central',
      'National League West',
    ];

    const divisions: DivisionGroup[] = DIVISION_ORDER
      .filter((d) => divMap.has(d))
      .map((d) => ({ name: d, rows: divMap.get(d)! }));

    // Any division not in the hardcoded order goes at the end (skip unnamed)
    for (const [name, rows] of Array.from(divMap)) {
      if (name && !DIVISION_ORDER.includes(name)) {
        divisions.push({ name, rows });
      }
    }

    return NextResponse.json({ season, divisions });
  } catch (err) {
    console.error('Standings API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}
