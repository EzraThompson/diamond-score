import { NextResponse } from 'next/server';
import { standingsCache } from '@/lib/cache';
import type { Standing } from '@/lib/types';

export const dynamic = 'force-dynamic';

export interface WBCPoolGroup {
  name: string;
  rows: Standing[];
}

export interface WBCStandingsData {
  pools: WBCPoolGroup[];
}

// ── ESPN WBC standings API types ──────────────────────────────────────

interface ESPNEntry {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    color?: string;
    logos?: { href: string }[];
  };
  stats: { name: string; value: number; displayValue?: string }[];
}

interface ESPNGroup {
  name?: string;
  abbreviation?: string;
  standings?: {
    entries: ESPNEntry[];
  };
  children?: ESPNGroup[];
}

interface ESPNStandingsResponse {
  children?: ESPNGroup[];
}

// ── Abbreviation normalization ──────────────────────────────────────────
// ESPN uses different abbreviations for some WBC teams than our registry.
const ESPN_ABBR_MAP: Record<string, string> = {
  COL: 'CLM', // Colombia — COL conflicts with MLB Colorado Rockies
};

// ── Helpers ────────────────────────────────────────────────────────────

function stat(entry: ESPNEntry, name: string): number {
  return entry.stats.find((s) => s.name === name)?.value ?? 0;
}

function parseEntry(entry: ESPNEntry): Standing {
  const wins   = Math.round(stat(entry, 'wins'));
  const losses = Math.round(stat(entry, 'losses'));
  const total  = wins + losses;
  const pct    = total > 0 ? wins / total : 0;

  // Games behind: ESPN sometimes provides this; otherwise calculate from leader
  // (caller will subtract the leader's GB from all rows to make the leader "0")
  const gb = stat(entry, 'gamesBehind');

  const abbreviation = ESPN_ABBR_MAP[entry.team.abbreviation] ?? entry.team.abbreviation;
  return {
    team: {
      id: parseInt(entry.team.id) || 0,
      name: entry.team.displayName,
      abbreviation,
      primaryColor: entry.team.color ? `#${entry.team.color}` : undefined,
      logoUrl: entry.team.logos?.[0]?.href,
    },
    division: '',
    wins,
    losses,
    pct,
    gamesBack: gb,
    streak: '',
    last10: '',
  };
}

function flattenGroups(groups: ESPNGroup[]): WBCPoolGroup[] {
  const pools: WBCPoolGroup[] = [];
  for (const group of groups) {
    // Recurse into children (ESPN nests conference → division for some sports)
    if (group.children?.length) {
      pools.push(...flattenGroups(group.children));
      continue;
    }

    const entries = group.standings?.entries;
    if (!entries?.length) continue;

    const rows = entries.map(parseEntry);

    // Normalize games back so the leader shows 0
    const minGB = Math.min(...rows.map((r) => r.gamesBack));
    for (const row of rows) row.gamesBack = Math.max(0, row.gamesBack - minGB);

    pools.push({
      name: group.name ?? group.abbreviation ?? 'Pool',
      rows,
    });
  }
  return pools;
}

// ── Route handler ──────────────────────────────────────────────────────

export async function GET() {
  const cacheKey = 'standings:wbc';
  const cached = standingsCache.get<WBCStandingsData>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/v2/sports/baseball/wbc/standings',
      { cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json({ pools: [] });
    }

    const data = (await res.json()) as ESPNStandingsResponse;
    const topGroups = data.children ?? [];
    const pools = flattenGroups(topGroups);

    const result: WBCStandingsData = { pools };
    standingsCache.set(cacheKey, result, 300); // 5 min

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ pools: [] });
  }
}
