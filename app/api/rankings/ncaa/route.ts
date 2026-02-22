import { NextResponse } from 'next/server';
import { gameCache } from '@/lib/cache';
import type { NCAARankingsData, RankedCollegeTeam } from '@/lib/types';

// ── ESPN API types ─────────────────────────────────────────────────────

interface ESPNRankTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  color?: string;
  logos?: { href: string }[];
}

interface ESPNRank {
  current: number;
  team: ESPNRankTeam;
  recordSummary?: string;   // "12-2"
  standingSummary?: string; // "1st in SEC"
}

interface ESPNRankingPoll {
  id: number;
  name: string;
  ranks: ESPNRank[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function parseConference(standingSummary?: string): string | undefined {
  if (!standingSummary) return undefined;
  // "1st in SEC" → "SEC", "T-2nd in ACC" → "ACC"
  const match = standingSummary.match(/\bin\s+(.+)$/i);
  return match?.[1]?.trim();
}

function parseRecord(recordSummary?: string): { wins: number; losses: number } {
  if (!recordSummary) return { wins: 0, losses: 0 };
  const parts = recordSummary.split('-');
  return {
    wins:   parseInt(parts[0] ?? '') || 0,
    losses: parseInt(parts[1] ?? '') || 0,
  };
}

// ── Route ──────────────────────────────────────────────────────────────

export async function GET() {
  const cacheKey = 'ncaa:rankings';
  const cached = gameCache.get<NCAARankingsData>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/rankings',
      { cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`ESPN rankings ${res.status}`);

    const data = (await res.json()) as { rankings?: ESPNRankingPoll[] };
    const polls = data.rankings ?? [];

    // Use the first poll (usually "College Baseball Poll" or AP Top 25)
    const poll = polls[0];
    if (!poll || poll.ranks.length === 0) {
      return NextResponse.json({ pollName: 'Rankings', teams: [] });
    }

    const teams: RankedCollegeTeam[] = poll.ranks.map((r) => ({
      rank: r.current,
      id: parseInt(r.team.id) || 0,
      displayName: r.team.displayName,
      abbreviation: r.team.abbreviation,
      primaryColor: r.team.color ? `#${r.team.color}` : undefined,
      logoUrl: r.team.logos?.[0]?.href,
      conference: parseConference(r.standingSummary),
      ...parseRecord(r.recordSummary),
    }));

    const result: NCAARankingsData = { pollName: poll.name, teams };
    gameCache.set(cacheKey, result, 3600); // 1 hour — rankings update weekly
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
