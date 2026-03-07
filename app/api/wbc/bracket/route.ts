import { NextResponse } from 'next/server';
import { gameCache } from '@/lib/cache';

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

// ── ESPN API types ─────────────────────────────────────────────────────

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    color?: string;
  };
  score?: string;
}

interface ESPNEvent {
  id: string;
  competitions: {
    startDate: string;
    type?: { abbreviation?: string };
    notes?: { type: string; headline: string }[];
    competitors: ESPNCompetitor[];
  }[];
  status: {
    type: { name: string; state: string; completed: boolean };
  };
  season?: { type?: number };
}

interface ESPNScoreboard {
  events?: ESPNEvent[];
}

// ── Abbreviation normalization ─────────────────────────────────────────
const ESPN_ABBR_MAP: Record<string, string> = {
  COL: 'CLM', // Colombia — COL conflicts with MLB Colorado Rockies
};

// ── Helpers ───────────────────────────────────────────────────────────

function mapStatus(name: string, state: string): 'scheduled' | 'live' | 'final' {
  if (state === 'post' || name.toLowerCase().includes('final')) return 'final';
  if (state === 'in') return 'live';
  return 'scheduled';
}

function parseTeam(c: ESPNCompetitor): BracketTeam {
  const abbreviation = ESPN_ABBR_MAP[c.team.abbreviation] ?? c.team.abbreviation;
  return {
    abbreviation,
    name: c.team.displayName,
    primaryColor: c.team.color ? `#${c.team.color}` : undefined,
    score: parseInt(c.score ?? '0') || 0,
  };
}

function getRound(event: ESPNEvent): string | null {
  const comp = event.competitions[0];
  if (!comp) return null;

  // Check ESPN notes for round label
  const headline = comp.notes?.[0]?.headline?.toLowerCase() ?? '';
  if (headline.includes('championship') || headline.includes('final') || headline.includes('world baseball classic')) {
    return 'Championship';
  }
  if (headline.includes('semifinal')) return 'Semifinal';
  if (headline.includes('quarterfinal')) return 'Quarterfinal';

  // Check season type: 3 = post-season
  if (event.season?.type === 3) return 'Quarterfinal'; // fallback label

  return null; // pool play — not bracket
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

function buildBracket(events: ESPNEvent[]): WBCBracketData {
  const qf: BracketGame[] = [];
  const sf: BracketGame[] = [];
  const ch: BracketGame[] = [];

  for (const event of events) {
    const round = getRound(event);
    if (!round) continue;

    const comp = event.competitions[0];
    if (!comp) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    const status = mapStatus(event.status.type.name, event.status.type.state);

    const game: BracketGame = {
      id: parseInt(event.id),
      homeTeam: home ? parseTeam(home) : null,
      awayTeam: away ? parseTeam(away) : null,
      homePlaceholder: '',
      awayPlaceholder: '',
      status,
      scheduledTime: comp.startDate,
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

  // Pad with placeholder-only games if ESPN hasn't released the schedule yet
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
  if (cached) return NextResponse.json(cached);

  try {
    // Fetch WBC scoreboard for the full tournament window (March 2026)
    const url =
      'https://site.api.espn.com/apis/site/v2/sports/baseball/world-baseball-classic/scoreboard?limit=200&dates=20260301-20260325';
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json({ quarterfinals: [], semifinals: [], championship: [] });
    }

    const data = (await res.json()) as ESPNScoreboard;
    const events = data.events ?? [];
    const bracket = buildBracket(events);

    gameCache.set(cacheKey, bracket, 300); // 5-min cache
    return NextResponse.json(bracket);
  } catch {
    return NextResponse.json({ quarterfinals: [], semifinals: [], championship: [] });
  }
}
