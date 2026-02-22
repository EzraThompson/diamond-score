import { NextRequest, NextResponse } from 'next/server';
import { scheduleCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface MLBScheduleDateEntry {
  date: string;
  games: unknown[];
}

interface MLBScheduleResponse {
  dates?: MLBScheduleDateEntry[];
}

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month — expected YYYY-MM' }, { status: 400 });
  }

  const cacheKey = `game-days:${month}`;
  const cached = scheduleCache.get<string[]>(cacheKey);
  if (cached) return NextResponse.json({ dates: cached });

  const [yearStr, monStr] = month.split('-');
  const year = parseInt(yearStr);
  const mon = parseInt(monStr);
  // new Date(year, mon, 0) gives last day of month `mon` (JS months are 0-indexed)
  const lastDay = new Date(year, mon, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${startDate}&endDate=${endDate}`,
      { cache: 'no-store' },
    );

    if (!res.ok) return NextResponse.json({ dates: [] });

    const data: MLBScheduleResponse = await res.json();
    const dates: string[] = (data.dates ?? []).map((d) => d.date);

    scheduleCache.set(cacheKey, dates, 3600); // 1 hour
    return NextResponse.json({ dates });
  } catch {
    return NextResponse.json({ dates: [] });
  }
}
