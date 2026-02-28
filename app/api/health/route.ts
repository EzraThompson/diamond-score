import { NextResponse } from 'next/server';
import { sourceHealth } from '@/lib/buildScores';

export const dynamic = 'force-dynamic';

const SOURCE_NAMES = ['mlb', 'milb', 'ncaa', 'npb', 'kbo'] as const;

/** A source is "healthy" if it has succeeded at least once and hasn't failed more than 3 times in a row. */
function classify(source: string): 'healthy' | 'degraded' | 'down' | 'unknown' {
  const h = sourceHealth[source];
  if (!h) return 'unknown';
  if (h.lastSuccessAt === null) return h.consecutiveFails > 0 ? 'down' : 'unknown';
  if (h.consecutiveFails >= 3) return 'down';
  if (h.consecutiveFails > 0) return 'degraded';
  return 'healthy';
}

export function GET() {
  const now = Date.now();

  const sources: Record<string, {
    status: string;
    lastSuccessAgo: string | null;
    lastErrorAgo: string | null;
    lastError: string | null;
    consecutiveFails: number;
  }> = {};

  for (const name of SOURCE_NAMES) {
    const h = sourceHealth[name];
    sources[name] = {
      status: classify(name),
      lastSuccessAgo: h?.lastSuccessAt != null
        ? `${Math.round((now - h.lastSuccessAt) / 1000)}s ago`
        : null,
      lastErrorAgo: h?.lastErrorAt != null
        ? `${Math.round((now - h.lastErrorAt) / 1000)}s ago`
        : null,
      lastError: h?.lastError ?? null,
      consecutiveFails: h?.consecutiveFails ?? 0,
    };
  }

  const overallStatus = Object.values(sources).every((s) => s.status === 'healthy' || s.status === 'unknown')
    ? 'ok'
    : Object.values(sources).some((s) => s.status === 'down')
      ? 'degraded'
      : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    uptime: process.uptime ? `${Math.round(process.uptime())}s` : null,
    ts: new Date().toISOString(),
    sources,
  });
}
