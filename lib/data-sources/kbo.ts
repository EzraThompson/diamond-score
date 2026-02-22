/**
 * KBO (Korean Baseball Organization) Data Source
 *
 * Uses the KBO official website's internal ASMX web service API.
 * All requests are POST with application/x-www-form-urlencoded bodies.
 *
 * Discovered endpoints:
 *   POST /ws/Main.asmx/GetKboGameList
 *     body: leId=1&srId=0%2C1%2C3%2C4%2C5%2C6%2C7%2C8%2C9&date=YYYYMMDD
 *     → { game: KBOGame[] }   (works for any date, not just today)
 *
 *   POST /ws/Schedule.asmx/GetScoreBoard
 *     body: gameId=GAMEID&leId=1&srId=SRID&seasonId=YEAR
 *     → [[gameInfo], [linescoreTableJSON]]
 *
 * Game status codes (GAME_STATE_SC):
 *   "1" = scheduled   "2" = live   "3" = final (postponed if CANCEL_SC_ID ≥ 1)
 *   "4" = postponed/cancelled    "5" = suspended/delayed
 *
 * Inning half (GAME_TB_SC_NM): "초" = top, "말" = bottom
 *
 * Score convention: T_SCORE_CN = away (top), B_SCORE_CN = home (bottom)
 *
 * Timezone: KST = UTC+9 (same offset as Japan's JST)
 */

import { gameCache } from '../cache';
import type {
  Game,
  GameDetail,
  GameStatus,
  InningHalf,
  League,
  LinescoreInning,
  Team,
} from '../types';

// ── Constants ─────────────────────────────────────────────────────────

const KBO_BASE = 'https://www.koreabaseball.com';

const KBO_LEAGUE: League = {
  id: 3,
  name: 'KBO',
  country: 'South Korea',
  logoUrl: '/logos/kbo.svg',
};

// KBO IDs live in [3_000_000, 4_000_000) — safely distinct from:
//   MLB        ~700K–800K
//   NPB        [2_000_000, 3_000_000)
//   ESPN/NCAA  ≥ 400_000_000
export const KBO_ID_MIN = 3_000_000;
export const KBO_ID_MAX = 4_000_000;

/**
 * Module-level map from numeric ID → URL params + cached Game.
 * Populated by getKBOGames(); consumed by getKBOGameDetail().
 */
const kboGameMeta = new Map<
  number,
  { gameId: string; srId: number; seasonId: number; date: string; game: Game }
>();

// ── Team lookup ───────────────────────────────────────────────────────

interface KBOTeamMeta {
  id: number;
  name: string;
  abbreviation: string;
  primaryColor: string;
}

/**
 * KBO internal team codes → English metadata.
 * Codes are stable across eras (SK became SSG Landers in 2021 but kept code "SK";
 * WO = Kiwoom Heroes, formerly Nexen/Woori Heroes; HT = KIA Tigers, formerly Haitai).
 */
const TEAM_BY_CODE: Record<string, KBOTeamMeta> = {
  'LG': { id: 1,  name: 'LG Twins',      abbreviation: 'LGT', primaryColor: '#C30452' },
  'OB': { id: 2,  name: 'Doosan Bears',  abbreviation: 'DSN', primaryColor: '#131230' },
  'HT': { id: 3,  name: 'KIA Tigers',    abbreviation: 'KIA', primaryColor: '#EA0029' },
  'SS': { id: 4,  name: 'Samsung Lions', abbreviation: 'SAM', primaryColor: '#074CA1' },
  'HH': { id: 5,  name: 'Hanwha Eagles', abbreviation: 'HNW', primaryColor: '#FF6600' },
  'SK': { id: 6,  name: 'SSG Landers',   abbreviation: 'SSG', primaryColor: '#CE0E2D' },
  'LT': { id: 7,  name: 'Lotte Giants',  abbreviation: 'LOT', primaryColor: '#041E42' },
  'WO': { id: 8,  name: 'Kiwoom Heroes', abbreviation: 'KWM', primaryColor: '#820024' },
  'KT': { id: 9,  name: 'KT Wiz',        abbreviation: 'KTW', primaryColor: '#000000' },
  'NC': { id: 10, name: 'NC Dinos',       abbreviation: 'NCD', primaryColor: '#315288' },
};

// ── Helpers ───────────────────────────────────────────────────────────

/** Converts a "YYYY-MM-DD" date + KST "HH:MM" time to an ISO 8601 UTC string. */
function kstTimeToISO(date: string, hhMM: string): string {
  return new Date(`${date}T${hhMM}:00+09:00`).toISOString();
}

/**
 * Deterministic integer ID in [KBO_ID_MIN, KBO_ID_MAX) from the KBO game ID.
 * KBO game IDs are already unique strings (e.g. "20250920SSLG0").
 */
function makeGameId(kboGameId: string): number {
  let h = 0;
  for (let i = 0; i < kboGameId.length; i++) {
    h = (Math.imul(31, h) + kboGameId.charCodeAt(i)) | 0;
  }
  return KBO_ID_MIN + (Math.abs(h) % (KBO_ID_MAX - KBO_ID_MIN));
}

function resolveTeam(code: string): Team {
  const meta = TEAM_BY_CODE[code];
  if (!meta) {
    return { id: 0, name: code, abbreviation: code };
  }
  return {
    id: meta.id,
    name: meta.name,
    abbreviation: meta.abbreviation,
    primaryColor: meta.primaryColor,
    // KBO CDN: initial-size (small) emblems don't require a season folder
    logoUrl: `https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/initial_${code}.png`,
  };
}

function mapStatus(stateSc: string, cancelId: string): GameStatus {
  switch (stateSc) {
    case '1': return 'scheduled';
    case '2': return 'live';
    case '3': return parseInt(cancelId, 10) >= 1 ? 'postponed' : 'final';
    case '4': return 'postponed';
    case '5': return 'delayed';
    default:  return 'scheduled';
  }
}

// ── Fetch helper ──────────────────────────────────────────────────────

const POST_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx',
};

async function kboPost<T = unknown>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${KBO_BASE}${path}`, {
    method: 'POST',
    headers: POST_HEADERS,
    body,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KBO POST ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Linescore table parser ─────────────────────────────────────────────

interface KBOTableCell { Text: string; Class: string | null }
interface KBOTableRow  { row: KBOTableCell[] }
interface KBOTable     { headers: KBOTableRow[]; rows: KBOTableRow[] }

interface ParsedLinescore {
  linescore:    LinescoreInning[];
  awayHits?:    number;
  awayErrors?:  number;
  homeHits?:    number;
  homeErrors?:  number;
}

/**
 * Parses the linescore HTML-table JSON string returned by GetScoreBoard[1][0].
 *
 * Table layout:
 *   headers[0].row = ["", "TEAM", "1", "2", …, "9", "R", "H", "E"]
 *   rows[0].row    = [result, teamInfo, inn1, …, innN, R, H, E]  ← AWAY team
 *   rows[1].row    = [result, teamInfo, inn1, …, innN, R, H, E]  ← HOME team
 *
 * Inning columns span indices [2, len-4] inclusive (skipping "", "TEAM" prefix
 * and "R", "H", "E" suffix). Scores of "-" or "" mean the half-inning was not played.
 */
function parseLinescoreTable(tableJson: string): ParsedLinescore | undefined {
  let tbl: KBOTable;
  try {
    tbl = JSON.parse(tableJson) as KBOTable;
  } catch {
    return undefined;
  }

  const headerRow = tbl.headers?.[0]?.row;
  const awayRow   = tbl.rows?.[0]?.row;
  const homeRow   = tbl.rows?.[1]?.row;
  if (!headerRow || !awayRow || !homeRow) return undefined;

  // Column layout: [0]="", [1]="TEAM", [2..N]= inning numbers, [N+1]="R", [N+2]="H", [N+3]="E"
  const PREFIX = 2; // skip "" and "TEAM"
  const SUFFIX = 3; // skip "R", "H", "E"
  const inningCount = headerRow.length - PREFIX - SUFFIX;
  if (inningCount <= 0) return undefined;

  const linescore: LinescoreInning[] = [];
  for (let i = 0; i < inningCount; i++) {
    const col = PREFIX + i;
    const inningNum = parseInt(headerRow[col]?.Text ?? '', 10);
    if (isNaN(inningNum)) continue;

    const awayText = awayRow[col]?.Text ?? '';
    const homeText = homeRow[col]?.Text ?? '';

    linescore.push({
      inning: inningNum,
      away: awayText === '' || awayText === '-' ? null : (parseInt(awayText, 10) || 0),
      home: homeText === '' || homeText === '-' ? null : (parseInt(homeText, 10) || 0),
    });
  }

  // R, H, E are the last 3 columns; we only need H and E (R = total runs, already known)
  const awayHits   = parseInt(awayRow.at(-2)?.Text ?? '', 10);
  const awayErrors = parseInt(awayRow.at(-1)?.Text ?? '', 10);
  const homeHits   = parseInt(homeRow.at(-2)?.Text ?? '', 10);
  const homeErrors = parseInt(homeRow.at(-1)?.Text ?? '', 10);

  return {
    linescore,
    awayHits:   isNaN(awayHits)   ? undefined : awayHits,
    awayErrors: isNaN(awayErrors) ? undefined : awayErrors,
    homeHits:   isNaN(homeHits)   ? undefined : homeHits,
    homeErrors: isNaN(homeErrors) ? undefined : homeErrors,
  };
}

// ── Scoreboard fetcher ─────────────────────────────────────────────────

interface ScoreboardResult {
  venue?:           string;
  startTime?:       string;        // "HH:MM" KST (actual, may differ from scheduled)
  parsedLinescore?: ParsedLinescore;
}

// Raw shape of GetScoreBoard response
interface RawScoreboard {
  S_NM?:    string;   // stadium name (Korean)
  START_TM?: string;  // actual start time "HH:MM"
  END_TM?:   string;
}

/**
 * Calls GetScoreBoard for a single game and extracts venue, start time, and linescore.
 * Returns undefined if the page is unavailable or the data is absent.
 * Uses per-game cache with TTL tuned to game status.
 */
async function fetchScoreboard(
  gameId:   string,
  srId:     number,
  seasonId: number,
  isLive:   boolean,
): Promise<ScoreboardResult | undefined> {
  const cacheKey = `kbo:sb:${gameId}`;
  const cached = gameCache.get<ScoreboardResult>(cacheKey);
  if (cached) return cached;

  let sb: [RawScoreboard[], string[]];
  try {
    sb = await kboPost('/ws/Schedule.asmx/GetScoreBoard', {
      gameId,
      leId:     '1',
      srId:     String(srId),
      seasonId: String(seasonId),
    });
  } catch {
    return undefined;
  }

  if (!Array.isArray(sb) || !sb[0]?.[0]) return undefined;

  const gameInfo = sb[0][0];
  const venue     = gameInfo.S_NM     || undefined;
  const rawStart  = gameInfo.START_TM ?? '';
  const startTime = /^\d{1,2}:\d{2}/.test(rawStart)
    ? rawStart.slice(0, 5).padStart(5, '0')
    : undefined;

  let parsedLinescore: ParsedLinescore | undefined;
  if (typeof sb[1]?.[0] === 'string') {
    parsedLinescore = parseLinescoreTable(sb[1][0]);
  }

  const result: ScoreboardResult = { venue, startTime, parsedLinescore };
  gameCache.set(cacheKey, result, isLive ? 30 : 300);
  return result;
}

// ── Game list API types ─────────────────────────────────────────────────

interface KBOGameRaw {
  G_ID:          string;    // "20250920SSLG0"
  G_DT:          string;    // "20250920"
  G_TM:          string;    // "17:00" KST
  S_NM:          string;    // stadium (Korean)
  AWAY_ID:       string;    // "SS"
  HOME_ID:       string;    // "LG"
  AWAY_NM:       string;    // Korean abbreviation
  HOME_NM:       string;
  T_SCORE_CN:    string;    // away total runs
  B_SCORE_CN:    string;    // home total runs
  GAME_STATE_SC: string;    // "1"|"2"|"3"|"4"|"5"
  GAME_INN_NO:   number | null;
  GAME_TB_SC_NM: string | null;  // "초"=top, "말"=bottom
  CANCEL_SC_ID:  string;    // "0" = normal
  SR_ID:         number;
  SEASON_ID:     number;
}

// ── Team records ──────────────────────────────────────────────────────────

type RecordMap = Record<string, { wins: number; losses: number }>;

interface KBORankRaw {
  TEAM_ID?: string;   // e.g. "LG"
  W_CN?:    string;   // wins count as string
  L_CN?:    string;   // losses count as string
  [key: string]: unknown;
}

/**
 * Fetches season standings from the KBO ASMX API to get W/L records.
 * Cached 1 hour. Returns an empty map if the call fails or the season
 * hasn't started yet (off-season returns empty data).
 */
async function getKBOTeamRecords(): Promise<RecordMap> {
  const cacheKey = 'kbo:records';
  const cached = gameCache.get<RecordMap>(cacheKey);
  if (cached) return cached;

  const records: RecordMap = {};
  const seasonId = new Date().getFullYear();

  // Try the most likely standings endpoint
  try {
    const rows = await kboPost<KBORankRaw[]>(
      '/ws/Record.asmx/GetTeamRank',
      { leId: '1', srId: '1', seasonId: String(seasonId) },
    );
    for (const row of rows ?? []) {
      const code = row.TEAM_ID;
      const meta = code ? TEAM_BY_CODE[code] : undefined;
      if (!meta) continue;
      const wins   = parseInt(String(row.W_CN  ?? ''), 10);
      const losses = parseInt(String(row.L_CN  ?? ''), 10);
      if (!isNaN(wins) && !isNaN(losses)) {
        records[meta.abbreviation] = { wins, losses };
      }
    }
  } catch {
    // Endpoint may not exist or season hasn't started — try alternate
    try {
      const rows = await kboPost<KBORankRaw[]>(
        '/ws/Main.asmx/GetTeamRank',
        { leId: '1', srId: '1', seasonId: String(seasonId) },
      );
      for (const row of rows ?? []) {
        const code = row.TEAM_ID;
        const meta = code ? TEAM_BY_CODE[code] : undefined;
        if (!meta) continue;
        const wins   = parseInt(String(row.W_CN  ?? ''), 10);
        const losses = parseInt(String(row.L_CN  ?? ''), 10);
        if (!isNaN(wins) && !isNaN(losses)) {
          records[meta.abbreviation] = { wins, losses };
        }
      }
    } catch (err) {
      console.error('KBO standings fetch failed:', err);
    }
  }

  gameCache.set(cacheKey, records, 3600); // 1-hour TTL
  return records;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Fetch KBO games for a given date string ("YYYY-MM-DD").
 *
 * Unlike the NPB scraper, this works for any date (not just today) because the
 * KBO ASMX endpoint accepts arbitrary dates.
 *
 * Caching: 30s TTL when any game is live; 60s otherwise.
 */
export async function getKBOGames(date: string): Promise<Game[]> {
  const cacheKey = `kbo:${date}`;
  const cached = gameCache.get<Game[]>(cacheKey);
  if (cached) return cached;

  const dateCompact = date.replace(/-/g, ''); // "YYYY-MM-DD" → "YYYYMMDD"

  let rawGames: KBOGameRaw[];
  try {
    const res = await kboPost<{ game: KBOGameRaw[] }>(
      '/ws/Main.asmx/GetKboGameList',
      { leId: '1', srId: '0,1,3,4,5,6,7,8,9', date: dateCompact },
    );
    rawGames = res.game ?? [];
  } catch (err) {
    console.error('KBO GetKboGameList failed:', err);
    return [];
  }

  if (rawGames.length === 0) {
    gameCache.set(cacheKey, [], 120);
    return [];
  }

  // Fetch team records and scoreboards in parallel
  const [teamRecords, sbResults] = await Promise.all([
    getKBOTeamRecords().catch(() => ({} as RecordMap)),
    Promise.all(
      rawGames.map((g) => {
        const isStarted = g.GAME_STATE_SC !== '1';
        if (!isStarted) return Promise.resolve(undefined);
        const isLive = g.GAME_STATE_SC === '2';
        return fetchScoreboard(g.G_ID, g.SR_ID, g.SEASON_ID, isLive).catch(
          () => undefined,
        );
      }),
    ),
  ]);

  const games: Game[] = [];

  for (let i = 0; i < rawGames.length; i++) {
    const g  = rawGames[i];
    const sb = sbResults[i];

    const status  = mapStatus(g.GAME_STATE_SC, g.CANCEL_SC_ID);
    const isLive  = status === 'live';

    // Use the scoreboard's actual start time when available; fall back to the
    // scheduled game time from the game list.
    const timeHHMM = sb?.startTime ?? g.G_TM;
    const scheduledTime = kstTimeToISO(date, timeHHMM);

    const currentInning: number | undefined =
      isLive ? (g.GAME_INN_NO ?? undefined) : undefined;

    const inningHalf: InningHalf | undefined = isLive
      ? g.GAME_TB_SC_NM === '초' ? 'top'
      : g.GAME_TB_SC_NM === '말' ? 'bottom'
      : undefined
      : undefined;

    const id = makeGameId(g.G_ID);

    const homeTeamBase = resolveTeam(g.HOME_ID);
    const awayTeamBase = resolveTeam(g.AWAY_ID);
    const homeRecord = teamRecords[homeTeamBase.abbreviation];
    const awayRecord = teamRecords[awayTeamBase.abbreviation];

    const game: Game = {
      id,
      league: KBO_LEAGUE,
      status,
      scheduledTime,
      homeTeam: { ...homeTeamBase, ...homeRecord },
      awayTeam: { ...awayTeamBase, ...awayRecord },
      homeScore: parseInt(g.B_SCORE_CN, 10) || 0,
      awayScore: parseInt(g.T_SCORE_CN, 10) || 0,
      currentInning,
      inningHalf,
      linescore:  sb?.parsedLinescore?.linescore?.length
        ? sb.parsedLinescore.linescore
        : undefined,
      homeHits:   sb?.parsedLinescore?.homeHits,
      awayHits:   sb?.parsedLinescore?.awayHits,
      homeErrors: sb?.parsedLinescore?.homeErrors,
      awayErrors: sb?.parsedLinescore?.awayErrors,
    };

    // Store for detail lookups
    kboGameMeta.set(id, { gameId: g.G_ID, srId: g.SR_ID, seasonId: g.SEASON_ID, date, game });

    games.push(game);
  }

  // Sort: live → final → scheduled → postponed/delayed
  const STATUS_ORDER: Record<GameStatus, number> = {
    live: 0, final: 1, scheduled: 2, postponed: 3, delayed: 3,
  };
  games.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const hasLive = games.some((g) => g.status === 'live');
  gameCache.set(cacheKey, games, hasLive ? 30 : 60);

  return games;
}

/**
 * Returns a GameDetail for a KBO game by its numeric ID.
 * Relies on getKBOGames() having been called first to populate kboGameMeta.
 * Throws if the ID is unknown.
 */
export async function getKBOGameDetail(id: number): Promise<GameDetail> {
  const meta = kboGameMeta.get(id);
  if (!meta) {
    throw new Error(
      `KBO game ${id} not found in meta cache — ensure getKBOGames() was called first`,
    );
  }

  const { gameId, srId, seasonId, game } = meta;
  const isLive = game.status === 'live';

  // Re-fetch scoreboard (uses per-game cache; short TTL when live)
  const sb = await fetchScoreboard(gameId, srId, seasonId, isLive);

  return {
    ...game,
    venue:      sb?.venue,
    linescore:  sb?.parsedLinescore?.linescore?.length
      ? sb.parsedLinescore.linescore
      : game.linescore,
    homeHits:   sb?.parsedLinescore?.homeHits   ?? game.homeHits,
    awayHits:   sb?.parsedLinescore?.awayHits   ?? game.awayHits,
    homeErrors: sb?.parsedLinescore?.homeErrors ?? game.homeErrors,
    awayErrors: sb?.parsedLinescore?.awayErrors ?? game.awayErrors,
    homeColor:  game.homeTeam.primaryColor,
    awayColor:  game.awayTeam.primaryColor,
  };
}
