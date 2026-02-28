import { getMLBGames } from './data-sources/mlb';
import { getMiLBGames } from './data-sources/milb';
import { getNCAAGames } from './data-sources/ncaa';
import { getNPBGames } from './data-sources/npb';
import { getKBOGames } from './data-sources/kbo';
import { getWBCGames } from './data-sources/wbc';
import { logger } from './logger';
import type { Game } from './types';

export interface LeagueGroup {
  id: number;
  name: string;
  country: string;
  logoUrl?: string;
  games: Game[];
  defaultCollapsed: boolean;
  showTop25Filter: boolean;
  /** Set when the source fetch failed. Games may be empty or stale. */
  error?: string;
  /** True when games come from stale cache rather than a fresh fetch. */
  stale?: boolean;
}

export interface ScoresResult {
  date: string;
  leagues: LeagueGroup[];
  hasLive: boolean;
}

// ── Per-source health tracking (in-memory, per process) ─────────────

export interface SourceHealth {
  lastSuccessAt: number | null;  // epoch ms
  lastErrorAt:   number | null;
  lastError:     string | null;
  consecutiveFails: number;
}

const initialHealth = (): SourceHealth => ({
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  consecutiveFails: 0,
});

export const sourceHealth: Record<string, SourceHealth> = {
  mlb:  initialHealth(),
  milb: initialHealth(),
  ncaa: initialHealth(),
  npb:  initialHealth(),
  kbo:  initialHealth(),
  wbc:  initialHealth(),
};

function recordSuccess(source: string): void {
  const h = sourceHealth[source];
  if (!h) return;
  h.lastSuccessAt = Date.now();
  h.consecutiveFails = 0;
  h.lastError = null;
}

function recordFailure(source: string, err: unknown): void {
  const h = sourceHealth[source];
  if (!h) return;
  h.lastErrorAt = Date.now();
  h.lastError = String(err);
  h.consecutiveFails++;
  logger.error(`${source} fetch failed`, {
    source,
    error: String(err),
    consecutiveFails: h.consecutiveFails,
  });
}

// ── Stale data fallback (stored after each successful buildScores) ───

const staleLeagues = new Map<string, LeagueGroup[]>();  // key = date

// ── Helpers ──────────────────────────────────────────────────────────

async function fetchSource<T>(
  source: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  const start = Date.now();
  try {
    const value = await fn();
    recordSuccess(source);
    logger.info(`${source} fetch ok`, { source, durationMs: Date.now() - start });
    return { ok: true, value };
  } catch (err) {
    recordFailure(source, err);
    logger.error(`${source} fetch error`, { source, durationMs: Date.now() - start, error: String(err) });
    return { ok: false };
  }
}

// ── buildScores ──────────────────────────────────────────────────────

export async function buildScores(date: string): Promise<ScoresResult> {
  const start = Date.now();

  const [mlbRes, milbRes, ncaaRes, npbRes, kboRes, wbcRes] = await Promise.all([
    fetchSource('mlb',  () => getMLBGames(date)),
    fetchSource('milb', () => getMiLBGames(date)),
    fetchSource('ncaa', () => getNCAAGames(date)),
    fetchSource('npb',  () => getNPBGames(date)),
    fetchSource('kbo',  () => getKBOGames(date)),
    fetchSource('wbc',  () => getWBCGames(date)),
  ]);

  const leagues: LeagueGroup[] = [];

  // ── MLB ─────────────────────────────────────────────────────────────
  if (mlbRes.ok) {
    if (mlbRes.value.length > 0) {
      leagues.push({
        id: 1, name: 'MLB', country: 'USA', logoUrl: '/logos/mlb.svg',
        games: mlbRes.value,
        defaultCollapsed: true, showTop25Filter: false,
      });
    }
  } else {
    leagues.push({
      id: 1, name: 'MLB', country: 'USA', logoUrl: '/logos/mlb.svg',
      games: [],
      defaultCollapsed: false, showTop25Filter: false,
      error: 'Data temporarily unavailable',
    });
  }

  // ── MiLB ────────────────────────────────────────────────────────────
  if (milbRes.ok) {
    for (const { level, games } of milbRes.value) {
      leagues.push({
        id: level.sportId, name: level.label, country: 'USA',
        games,
        defaultCollapsed: true, showTop25Filter: false,
      });
    }
  }
  // MiLB failure is silent — it's supplementary data

  // ── NPB ─────────────────────────────────────────────────────────────
  if (npbRes.ok) {
    if (npbRes.value.length > 0) {
      leagues.push({
        id: 2, name: 'NPB', country: 'Japan', logoUrl: '/logos/npb.svg',
        games: npbRes.value,
        defaultCollapsed: false, showTop25Filter: false,
      });
    }
  } else {
    leagues.push({
      id: 2, name: 'NPB', country: 'Japan', logoUrl: '/logos/npb.svg',
      games: [],
      defaultCollapsed: false, showTop25Filter: false,
      error: 'Data temporarily unavailable',
    });
  }

  // ── KBO ─────────────────────────────────────────────────────────────
  if (kboRes.ok) {
    if (kboRes.value.length > 0) {
      leagues.push({
        id: 3, name: 'KBO', country: 'South Korea', logoUrl: '/logos/kbo.svg',
        games: kboRes.value,
        defaultCollapsed: false, showTop25Filter: false,
      });
    }
  } else {
    leagues.push({
      id: 3, name: 'KBO', country: 'South Korea', logoUrl: '/logos/kbo.svg',
      games: [],
      defaultCollapsed: false, showTop25Filter: false,
      error: 'Data temporarily unavailable',
    });
  }

  // ── NCAA ─────────────────────────────────────────────────────────────
  if (ncaaRes.ok) {
    if (ncaaRes.value.length > 0) {
      leagues.push({
        id: 16, name: 'College Baseball', country: 'USA',
        games: ncaaRes.value,
        defaultCollapsed: true, showTop25Filter: true,
      });
    }
  } else {
    leagues.push({
      id: 16, name: 'College Baseball', country: 'USA',
      games: [],
      defaultCollapsed: true, showTop25Filter: true,
      error: 'Data temporarily unavailable',
    });
  }

  // ── WBC ──────────────────────────────────────────────────────────────
  // WBC is a periodic tournament — only show the section when games exist.
  // Failures are silent (no error card) since it's not always active.
  if (wbcRes.ok && wbcRes.value.length > 0) {
    leagues.push({
      id: 20, name: 'World Baseball Classic', country: 'International',
      games: wbcRes.value,
      defaultCollapsed: false, showTop25Filter: false,
    });
  }

  // ── Stale fallback for error leagues ─────────────────────────────────
  const prevLeagues = staleLeagues.get(date);
  if (prevLeagues) {
    for (const league of leagues) {
      if (league.error) {
        const stale = prevLeagues.find((l) => l.id === league.id);
        if (stale?.games.length) {
          league.games = stale.games;
          league.stale = true;
          league.error = 'Data may be delayed';
        }
      }
    }
  }

  // Cache successful result for future stale lookups
  const hasAnySuccess = mlbRes.ok || npbRes.ok || kboRes.ok || ncaaRes.ok;
  if (hasAnySuccess) {
    staleLeagues.set(date, leagues.filter((l) => !l.error));
  }

  const hasLive = leagues.some((l) => l.games.some((g) => g.status === 'live'));

  logger.info('buildScores complete', { date, durationMs: Date.now() - start, leagueCount: leagues.length, hasLive });

  return { date, leagues, hasLive };
}
