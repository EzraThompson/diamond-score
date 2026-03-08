import { NextResponse } from 'next/server';
import { gameCache } from '@/lib/cache';
import { WBC_ABBR_MAP, WBC_TEAM_COLORS } from '@/lib/data-sources/wbc';
import { withRetry } from '@/lib/retry';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────

export interface BracketTeam {
  abbreviation: string;
  name: string;
  primaryColor?: string;
  score: number;
}

export interface BracketGame {
  id: number;
  homeTeam: BracketTeam | null; // null = TBD
  awayTeam: BracketTeam | null; // null = TBD
  homePlaceholder: string;       // e.g. "1st Pool A"
  awayPlaceholder: string;       // e.g. "2nd Pool B"
  status: 'scheduled' | 'live' | 'final';
  scheduledTime: string;
  round: string;                 // "Quarterfinal" | "Semifinal" | "Championship"
}

export interface WBCBracketData {
  quarterfinals: BracketGame[];
  semifinals: BracketGame[];
  championship: BracketGame[];
}

// ── MLB Stats API types ───────────────────────────────────────────────

interface MLBScheduleResponse {
  dates: {
    date: string;
    games: MLBBracketGame[];
  }[];
}

interface MLBBracketGame {
  gamePk: number;
  gameDate: string;
  gameType: string; // D=Quarterfinal, L=Semifinal, W=Championship, F=Pool
  status: {
    abstractGameCode: string;
    codedGameState: string;
    statusCode: string;
  };
  teams: {
    home: { score?: number; team: { id: number; name: string; abbreviation?: string } };
    away: { score?: number; team: { id: number; name: string; abbreviation?: string } };
  };
  description?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getRoundFromGameType(gameType: string): string | null {
  switch (gameType) {
    case 'D': return 'Quarterfinal';
    case 'L': return 'Semifinal';
    case 'W': return 'Championship';
    default: return null; // F = pool play, excluded from bracket
  }
}

function mapStatus(statusCode: string, abstractGameCode?: string): 'scheduled' | 'live' | 'final' {
  if (['F', 'FT', 'FR', 'FO', 'FM', 'CR', 'GO', 'O'].includes(statusCode)) return 'final';
  if (['I', 'MA', 'MB', 'MC'].includes(statusCode)) return 'live';
  if (abstractGameCode === 'F') return 'final';
  if (abstractGameCode === 'L') return 'live';
  return 'scheduled';
}

function parseTeam(t: { id: number; name: string; abbreviation?: string }, score: number): BracketTeam {
  const rawAbbr = t.abbreviation ?? t.name.slice(0, 3).toUpperCase();
  const abbreviation = WBC_ABBR_MAP[rawAbbr] ?? rawAbbr;
  return {
    abbreviation,
    name: t.name,
    primaryColor: WBC_TEAM_COLORS[t.id],
    score,
  };
}

// WBC bracket seeding: known format for 2023/2026
// QF1: 1st Pool C vs 2nd Pool D (USA site)
// QF2: 1st Pool D vs 2nd Pool C (USA site)
// QF3: 1st Pool A vs 2nd Pool B (Japan site)
// QF4: 1st Pool B vs 2nd Pool A (Japan site)
const QF_PLACEHOLDERS = [
  { away: '1st Pool C', home: '2nd Pool D' },
  { away: '2nd Pool C', home: '1st Pool D' },
  { away: '1st Pool A', home: '2nd Pool B' },
  { away: '2nd Pool A', home: '1st Pool B' },
];
const SF_PLACEHOLDERS = [
  { away: 'Winner QF1', home: 'Winner QF2' },
  { away: 'Winner QF3', home: 'Winner QF4' },
];
const FINAL_PLACEHOLDERS = [
  { away: 'Winner SF1', home: 'Winner SF2' },
];

function buildBracket(games: MLBBracketGame[]): WBCBracketData {
  const qf: BracketGame[] = [];
  const sf: BracketGame[] = [];
  const ch: BracketGame[] = [];

  for (const g of games) {
    const round = getRoundFromGameType(g.gameType);
    if (!round) continue;

    const home = g.teams.home;
    const away = g.teams.away;
    const status = mapStatus(g.status.statusCode, g.status.abstractGameCode);

    const game: BracketGame = {
      id: g.gamePk,
      homeTeam: home.team.name ? parseTeam(home.team, home.score ?? 0) : null,
      awayTeam: away.team.name ? parseTeam(away.team, away.score ?? 0) : null,
      homePlaceholder: '',
      awayPlaceholder: '',
      status,
      scheduledTime: g.gameDate,
      round,
    };

    if (round === 'Quarterfinal') qf.push(game);
    else if (round === 'Semifinal') sf.push(game);
    else ch.push(game);
  }

  // Sort each round by scheduled time
  const byTime = (a: BracketGame, b: BracketGame) =>
    new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  qf.sort(byTime);
  sf.sort(byTime);
  ch.sort(byTime);

  // Assign placeholders to games that haven't been played yet
  qf.forEach((g, i) => {
    const ph = QF_PLACEHOLDERS[i] ?? { away: `QF ${i + 1} Away`, home: `QF ${i + 1} Home` };
    g.awayPlaceholder = ph.away;
    g.homePlaceholder = ph.home;
  });
  sf.forEach((g, i) => {
    const ph = SF_PLACEHOLDERS[i] ?? { away: `SF ${i + 1} Away`, home: `SF ${i + 1} Home` };
    g.awayPlaceholder = ph.away;
    g.homePlaceholder = ph.home;
  });
  ch.forEach((g, i) => {
    const ph = FINAL_PLACEHOLDERS[i] ?? { away: 'SF Winner', home: 'SF Winner' };
    g.awayPlaceholder = ph.away;
    g.homePlaceholder = ph.home;
  });

  // Pad with placeholder-only games if the schedule hasn't been released yet
  while (qf.length < 4) {
    const i = qf.length;
    const ph = QF_PLACEHOLDERS[i];
    qf.push({ id: -(i + 1), homeTeam: null, awayTeam: null,
      homePlaceholder: ph.home, awayPlaceholder: ph.away,
      status: 'scheduled', scheduledTime: '', round: 'Quarterfinal' });
  }
  while (sf.length < 2) {
    const i = sf.length;
    const ph = SF_PLACEHOLDERS[i];
    sf.push({ id: -(10 + i), homeTeam: null, awayTeam: null,
      homePlaceholder: ph.home, awayPlaceholder: ph.away,
      status: 'scheduled', scheduledTime: '', round: 'Semifinal' });
  }
  if (ch.length < 1) {
    ch.push({ id: -20, homeTeam: null, awayTeam: null,
      homePlaceholder: FINAL_PLACEHOLDERS[0].home, awayPlaceholder: FINAL_PLACEHOLDERS[0].away,
      status: 'scheduled', scheduledTime: '', round: 'Championship' });
  }

  return { quarterfinals: qf, semifinals: sf, championship: ch };
}

// ── Route handler ──────────────────────────────────────────────────────

export async function GET() {
  const cacheKey = 'wbc:bracket';
  const cached = gameCache.get<WBCBracketData>(cacheKey);
  const cacheHeaders = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };
  if (cached) return NextResponse.json(cached, { headers: cacheHeaders });

  try {
    // Fetch WBC schedule for the full tournament window (March 2026)
    const url =
      'https://statsapi.mlb.com/api/v1/schedule?sportId=51&startDate=2026-03-01&endDate=2026-03-25&hydrate=team';

    const res = await withRetry(
      async () => {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`MLB WBC bracket API ${r.status}`);
        return r;
      },
      { retries: 2, baseDelayMs: 500, source: 'wbc', label: 'bracket' },
    );

    const data = (await res.json()) as MLBScheduleResponse;
    const allGames: MLBBracketGame[] = [];
    for (const dateEntry of data.dates ?? []) {
      allGames.push(...dateEntry.games);
    }

    const bracket = buildBracket(allGames);

    gameCache.set(cacheKey, bracket, 300); // 5-min cache
    return NextResponse.json(bracket, { headers: cacheHeaders });
  } catch {
    return NextResponse.json({ quarterfinals: [], semifinals: [], championship: [] });
  }
}
