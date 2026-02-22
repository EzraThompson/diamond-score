/**
 * NPB (Nippon Professional Baseball) Data Source
 *
 * Scrapes live scores from the NPB official site (npb.jp).
 *
 * Approach:
 *   1. Fetch https://npb.jp/ and parse the `#header_score` bar, which the
 *      server always renders with today's games in JST.
 *   2. If the requested date matches today in JST, extract each game's teams,
 *      score, and status from the header, then fetch each game detail page in
 *      parallel for the inning-by-inning linescore and precise start time.
 *
 * Conventions (verified from HTML):
 *   - Left logo  = HOME team  (`.logo_left` img)
 *   - Right logo = AWAY team  (`.logo_right` img)
 *   - Header score text "X-Y" = homeScore-awayScore
 *   - URL slug format: `/scores/YYYY/MMDD/{homeCode}-{awayCode}-{gameNum}/`
 *   - Linescore `.top` row = away team, `.bottom` row = home team
 *
 * Limitation: the header score bar only reflects the current date in JST.
 *   Requests for other dates return an empty array rather than throwing.
 *
 * Error handling: if the site structure changes (selectors no longer match),
 *   functions return empty arrays rather than crashing the whole API route.
 */

import { load } from 'cheerio';
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

// ── Constants ────────────────────────────────────────────────────────

const NPB_BASE = 'https://npb.jp';

const NPB_LEAGUE: League = {
  id: 2,
  name: 'NPB',
  country: 'Japan',
  logoUrl: '/logos/npb.svg',
};

// NPB IDs live in [2_000_000, 3_000_000) — safely above MLB (~900K) and
// well below ESPN/NCAA IDs (>400M). Export so the route can detect them.
export const NPB_ID_MIN = 2_000_000;
export const NPB_ID_MAX = 3_000_000;

/**
 * Module-level map from game ID → URL components + cached Game object,
 * populated by getNPBGames(). Lets getNPBGameDetail() look up a game's
 * page URL and base data without re-scraping the homepage.
 */
const npbGameMeta = new Map<
  number,
  { year: string; mmdd: string; slug: string; date: string; game: Game }
>();

// ── Team lookup table ────────────────────────────────────────────────

interface NPBTeamMeta {
  id: number;
  name: string;         // English name
  abbreviation: string;
  primaryColor: string;
  code: string;         // NPB internal logo code (e.g. "g", "t", "db")
}

/**
 * Keyed by the full Japanese team name as it appears in img alt attributes.
 * Covers all 12 NPB teams across both leagues.
 */
const TEAM_BY_JA: Record<string, NPBTeamMeta> = {
  // ── Central League ─────────────────────────────────────────────────
  '読売ジャイアンツ': {
    id: 1, name: 'Yomiuri Giants', abbreviation: 'G',
    primaryColor: '#F15A22', code: 'g',
  },
  '阪神タイガース': {
    id: 2, name: 'Hanshin Tigers', abbreviation: 'T',
    primaryColor: '#FFE200', code: 't',
  },
  '横浜DeNAベイスターズ': {
    id: 3, name: 'DeNA BayStars', abbreviation: 'DB',
    primaryColor: '#003087', code: 'db',
  },
  '広島東洋カープ': {
    id: 4, name: 'Hiroshima Carp', abbreviation: 'C',
    primaryColor: '#C8102E', code: 'c',
  },
  '中日ドラゴンズ': {
    id: 5, name: 'Chunichi Dragons', abbreviation: 'D',
    primaryColor: '#003A78', code: 'd',
  },
  '東京ヤクルトスワローズ': {
    id: 6, name: 'Tokyo Yakult Swallows', abbreviation: 'S',
    primaryColor: '#004098', code: 's',
  },
  // ── Pacific League ─────────────────────────────────────────────────
  'オリックス・バファローズ': {
    id: 7, name: 'Orix Buffaloes', abbreviation: 'Bs',
    primaryColor: '#00356D', code: 'b',
  },
  '福岡ソフトバンクホークス': {
    id: 8, name: 'SoftBank Hawks', abbreviation: 'H',
    primaryColor: '#FCC40D', code: 'h',
  },
  '東北楽天ゴールデンイーグルス': {
    id: 9, name: 'Rakuten Eagles', abbreviation: 'E',
    primaryColor: '#9E1B32', code: 'e',
  },
  '埼玉西武ライオンズ': {
    id: 10, name: 'Seibu Lions', abbreviation: 'L',
    primaryColor: '#00578A', code: 'l',
  },
  '千葉ロッテマリーンズ': {
    id: 11, name: 'Lotte Marines', abbreviation: 'M',
    primaryColor: '#000000', code: 'm',
  },
  '北海道日本ハムファイターズ': {
    id: 12, name: 'Nippon-Ham Fighters', abbreviation: 'F',
    primaryColor: '#0C1C5F', code: 'f',
  },
};

/** Reverse lookup: NPB logo code → team meta (used as fallback). */
const TEAM_BY_CODE: Record<string, NPBTeamMeta> = Object.fromEntries(
  Object.values(TEAM_BY_JA).map((t) => [t.code, t]),
);

// ── Helpers ──────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in JST (UTC+9). */
function todayJST(): string {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jstNow.toISOString().slice(0, 10);
}

/**
 * Converts a date + JST clock time to an ISO 8601 UTC string.
 * @param date   "YYYY-MM-DD"
 * @param hhMM   "HH:MM" in JST (Asia/Tokyo = UTC+9)
 */
function jstTimeToISO(date: string, hhMM: string): string {
  return new Date(`${date}T${hhMM}:00+09:00`).toISOString();
}

/**
 * Builds a stable integer ID in [NPB_ID_MIN, NPB_ID_MAX) from the game's
 * date + slug. Kept bounded to avoid colliding with MLB (~900K) or ESPN (>400M).
 */
function makeGameId(mmdd: string, slug: string): number {
  const str = mmdd + slug.replace(/-/g, '');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return NPB_ID_MIN + (Math.abs(h) % (NPB_ID_MAX - NPB_ID_MIN));
}

/**
 * Resolves a Japanese team name (from img alt) to a Team object.
 * Falls back to the logo code extracted from the img src if the name is unknown.
 */
function resolveTeam(
  jaName: string,
  imgSrc: string,
  year: string,
): Team {
  const meta =
    TEAM_BY_JA[jaName] ??
    TEAM_BY_CODE[imgSrc.match(/logo_([^_]+)_s\.gif/)?.[1] ?? ''];

  if (!meta) {
    // Unknown team — return a minimal object so the game still renders
    return {
      id: 0,
      name: jaName || 'Unknown',
      abbreviation: jaName.slice(0, 3) || '???',
      logoUrl: undefined,
      primaryColor: undefined,
    };
  }

  return {
    id: meta.id,
    name: meta.name,
    abbreviation: meta.abbreviation,
    primaryColor: meta.primaryColor,
    logoUrl: `https://npb.jp/img/common/logo/${year}/logo_${meta.code}_m.gif`,
  };
}

/**
 * Maps NPB status text (from `.state` div or `.game_info` paragraph) to our
 * GameStatus enum. The `.state` div looks like "（金武）試合終了" or "3回表".
 */
function mapStatus(stateText: string): GameStatus {
  const t = stateText.replace(/[\s　\u3000]+/g, ' ').trim();

  if (/試合終了|コールド/.test(t)) return 'final';
  if (/中止|ノーゲーム|延期/.test(t)) return 'postponed';
  if (/延長/.test(t) && /終了/.test(t)) return 'final';
  // Live: text contains inning reference like "3回表" / "3回裏"
  if (/\d+回/.test(t)) return 'live';
  // Live: text explicitly says 試合中
  if (/試合中|進行/.test(t)) return 'live';

  return 'scheduled';
}

/**
 * Parses the current inning number and half (top/bottom) from state text
 * such as "3回表" (3rd top) or "7回裏" (7th bottom).
 */
function parseInning(stateText: string): {
  inning?: number;
  half?: InningHalf;
} {
  const m = stateText.match(/(\d+)回([表裏])/);
  if (!m) return {};
  return {
    inning: parseInt(m[1]),
    half: m[2] === '表' ? 'top' : 'bottom',
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
};

async function npbFetch(url: string): Promise<string> {
  const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`NPB fetch ${res.status}: ${url}`);
  return res.text();
}

// ── Game detail page parser ───────────────────────────────────────────

interface GameDetailResult {
  startTime?: string;      // "HH:MM" in JST, undefined if not started
  venue?: string;          // Stadium name extracted from .game_tit .place
  linescore: LinescoreInning[];
  awayHits?: number;
  awayErrors?: number;
  homeHits?: number;
  homeErrors?: number;
  /** More precise status from the game page (overrides header status). */
  status?: GameStatus;
  inning?: number;
  half?: InningHalf;
}

/**
 * Fetches a single game detail page and extracts the linescore and start time.
 * Returns undefined if the page is a 404 or the linescore table is absent.
 */
async function fetchGameDetail(
  slug: string,        // e.g. "e-m-01"
  year: string,        // e.g. "2026"
  mmdd: string,        // e.g. "0221"
): Promise<GameDetailResult | undefined> {
  const pageCacheKey = `npb:page:${year}:${mmdd}:${slug}`;
  const pageCached = gameCache.get<GameDetailResult>(pageCacheKey);
  if (pageCached) return pageCached;

  const url = `${NPB_BASE}/scores/${year}/${mmdd}/${slug}/`;
  let html: string;
  try {
    html = await npbFetch(url);
  } catch {
    return undefined;
  }

  const $ = load(html);

  // A 404 page has a .notfound div but no linescore table
  if (!$('#table_linescore').length) return undefined;

  // ── Venue ────────────────────────────────────────────────────────────
  const venue = $('.game_tit .place').text().trim() || undefined;

  // ── Start time ──────────────────────────────────────────────────────
  let startTime: string | undefined;
  const gameInfoText = $('.game_info').text();
  const startMatch = gameInfoText.match(/開始\s*(\d{1,2}:\d{2})/);
  if (startMatch) startTime = startMatch[1].padStart(5, '0'); // ensure HH:MM

  // ── Status from game info (more reliable than header for edge cases) ─
  let status: GameStatus | undefined;
  let inning: number | undefined;
  let half: InningHalf | undefined;
  if (gameInfoText) {
    status = mapStatus(gameInfoText);
    if (status === 'live') {
      const parsed = parseInning(gameInfoText);
      inning = parsed.inning;
      half = parsed.half;
    }
  }

  // ── Linescore ───────────────────────────────────────────────────────
  const linescore: LinescoreInning[] = [];

  // Column headers: <th>1</th><th>2</th>...<th>9</th> (or more in extras)
  const inningNums: number[] = [];
  $('#table_linescore thead tr th').each((_, th) => {
    const n = parseInt($(th).text().trim());
    if (!isNaN(n)) inningNums.push(n);
  });

  // away = .top row, home = .bottom row
  const awayScores: (number | null)[] = [];
  const homeScores: (number | null)[] = [];

  const parseTotals = ($row: ReturnType<typeof $>) => {
    const totals = $row.find('td.total-2');
    const h = parseInt($(totals.get(0)).text().trim());
    const e = parseInt($(totals.get(1)).text().trim());
    return { hits: isNaN(h) ? undefined : h, errors: isNaN(e) ? undefined : e };
  };

  $('#table_linescore tbody tr.top td:not(.total-1):not(.total-2)').each(
    (_, td) => {
      const t = $(td).text().trim();
      awayScores.push(t === '' || t === '-' ? null : (parseInt(t) || 0));
    },
  );
  const awayTotals = parseTotals($('#table_linescore tbody tr.top'));
  const awayHits = awayTotals.hits;
  const awayErrors = awayTotals.errors;

  $('#table_linescore tbody tr.bottom td:not(.total-1):not(.total-2)').each(
    (_, td) => {
      const t = $(td).text().trim();
      homeScores.push(t === '' || t === '-' ? null : (parseInt(t) || 0));
    },
  );
  const homeTotals = parseTotals($('#table_linescore tbody tr.bottom'));
  const homeHits = homeTotals.hits;
  const homeErrors = homeTotals.errors;

  for (let i = 0; i < inningNums.length; i++) {
    linescore.push({
      inning: inningNums[i],
      away: awayScores[i] ?? null,
      home: homeScores[i] ?? null,
    });
  }

  const result: GameDetailResult = {
    startTime,
    venue,
    linescore: linescore.length > 0 ? linescore : [],
    awayHits,
    awayErrors,
    homeHits,
    homeErrors,
    status,
    inning,
    half,
  };

  const isLive = status === 'live';
  gameCache.set(pageCacheKey, result, isLive ? 30 : 300);
  return result;
}

// ── Homepage parser ───────────────────────────────────────────────────

interface HeaderGame {
  homeTeamJa: string;
  awayTeamJa: string;
  homeImgSrc: string;
  awayImgSrc: string;
  scoreText: string;   // e.g. "3-3"
  stateText: string;   // e.g. "（金武）試合終了"
  slug: string;        // e.g. "e-m-01"
  year: string;        // e.g. "2026"
  mmdd: string;        // e.g. "0221"
}

/**
 * Parses the `#header_score` bar from the NPB homepage HTML.
 * Returns the header's calendar date and the list of game stubs.
 */
function parseHeaderScores(html: string): {
  headerDate: string | null;  // "YYYY-MM-DD" or null if unparseable
  games: HeaderGame[];
} {
  const $ = load(html);
  const games: HeaderGame[] = [];

  // ── Extract the date ──────────────────────────────────────────────
  let headerDate: string | null = null;
  try {
    const dateHtml = $('.score_box.date div').html() ?? '';
    // Expected: "2026<br>2/21 Sat." → year=2026, month=2, day=21
    const [yearStr, rest] = dateHtml.split(/<br\s*\/?>/i);
    const monthDayMatch = rest?.trim().match(/(\d{1,2})\/(\d{1,2})/);
    if (yearStr && monthDayMatch) {
      const yr = yearStr.trim();
      const mo = monthDayMatch[1].padStart(2, '0');
      const dy = monthDayMatch[2].padStart(2, '0');
      headerDate = `${yr}-${mo}-${dy}`;
    }
  } catch {
    // Leave headerDate as null
  }

  // ── Extract each game box ─────────────────────────────────────────
  // Skip .date and .detail boxes; only process real game boxes
  $('#header_score .score_box').each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('date') || $el.hasClass('detail')) return;

    const href = $el.find('a').attr('href') ?? '';
    // href: "/scores/2026/0221/e-m-01/"
    const parts = href.replace(/^\/scores\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 3) return;
    const [year, mmdd, slug] = parts;

    const homeImg = $el.find('img.logo_left');
    const awayImg = $el.find('img.logo_right');

    games.push({
      homeTeamJa: homeImg.attr('alt') ?? '',
      awayTeamJa: awayImg.attr('alt') ?? '',
      homeImgSrc: homeImg.attr('src') ?? '',
      awayImgSrc: awayImg.attr('src') ?? '',
      scoreText: $el.find('.score').text().trim(),
      stateText: $el.find('.state').text().trim(),
      slug,
      year,
      mmdd,
    });
  });

  return { headerDate, games };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Fetch NPB games for a given date string ("YYYY-MM-DD").
 *
 * Returns an empty array for any date that isn't today in JST, since the NPB
 * homepage header only serves the current day's games.
 *
 * Caching: 30s TTL when any game is live; 60s TTL otherwise.
 */
export async function getNPBGames(date: string): Promise<Game[]> {
  const cacheKey = `npb:${date}`;
  const cached = gameCache.get<Game[]>(cacheKey);
  if (cached) return cached;

  // Only fetch if this date is today in JST — otherwise the header won't match
  if (date !== todayJST()) return [];

  // ── Step 1: fetch homepage and parse the header score bar ─────────
  let html: string;
  try {
    html = await npbFetch(`${NPB_BASE}/`);
  } catch (err) {
    console.error('NPB homepage fetch failed:', err);
    return [];
  }

  const { headerDate, games: headerGames } = parseHeaderScores(html);

  if (!headerDate || headerDate !== date || headerGames.length === 0) {
    // Date mismatch or no games today
    gameCache.set(cacheKey, [], 120);
    return [];
  }

  // ── Step 2: fetch each game detail page in parallel ───────────────
  const detailResults = await Promise.all(
    headerGames.map((g) =>
      fetchGameDetail(g.slug, g.year, g.mmdd).catch(() => undefined),
    ),
  );

  // ── Step 3: assemble Game objects ─────────────────────────────────
  const games: Game[] = [];

  for (let i = 0; i < headerGames.length; i++) {
    const hg = headerGames[i];
    const detail = detailResults[i];

    // Parse score: "X-Y" → homeScore=X, awayScore=Y
    const [rawHome, rawAway] = hg.scoreText.split('-');
    const homeScore = parseInt(rawHome ?? '0') || 0;
    const awayScore = parseInt(rawAway ?? '0') || 0;

    // Status: prefer detail page (more precise), fall back to header
    const headerStatus = mapStatus(hg.stateText);
    const status: GameStatus = detail?.status ?? headerStatus;

    // Inning / half from header (detail page may refine this)
    const inningFromHeader = parseInning(hg.stateText);
    const currentInning = detail?.inning ?? inningFromHeader.inning;
    const inningHalf: InningHalf | undefined =
      detail?.half ?? inningFromHeader.half;

    // Scheduled time: use game detail start time or midnight JST as placeholder
    const scheduledTime =
      detail?.startTime
        ? jstTimeToISO(date, detail.startTime)
        : `${date}T00:00:00+09:00`;

    const id = makeGameId(hg.mmdd, hg.slug);

    const game: Game = {
      id,
      league: NPB_LEAGUE,
      status,
      scheduledTime,
      homeTeam: resolveTeam(hg.homeTeamJa, hg.homeImgSrc, hg.year),
      awayTeam: resolveTeam(hg.awayTeamJa, hg.awayImgSrc, hg.year),
      homeScore,
      awayScore,
      currentInning: status === 'live' ? currentInning : undefined,
      inningHalf: status === 'live' ? inningHalf : undefined,
      linescore: detail?.linescore?.length ? detail.linescore : undefined,
      homeHits: detail?.homeHits,
      awayHits: detail?.awayHits,
      homeErrors: detail?.homeErrors,
      awayErrors: detail?.awayErrors,
    };

    // Store metadata so getNPBGameDetail() can look up the page URL by ID
    npbGameMeta.set(id, { year: hg.year, mmdd: hg.mmdd, slug: hg.slug, date, game });

    games.push(game);
  }

  // Sort: live → final → scheduled → postponed
  const STATUS_ORDER: Record<GameStatus, number> = {
    live: 0, final: 1, scheduled: 2, postponed: 3, delayed: 3,
  };
  games.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const hasLive = games.some((g) => g.status === 'live');
  gameCache.set(cacheKey, games, hasLive ? 30 : 60);

  return games;
}

/**
 * Returns a GameDetail for an NPB game given its ID.
 *
 * Relies on getNPBGames() having been called first to populate npbGameMeta.
 * Throws if the ID is unknown (caller should surface as 404/500).
 */
export async function getNPBGameDetail(id: number): Promise<GameDetail> {
  const meta = npbGameMeta.get(id);
  if (!meta) {
    throw new Error(
      `NPB game ${id} not found in meta cache — ensure getNPBGames() was called first`,
    );
  }

  const { year, mmdd, slug, date, game } = meta;

  // Re-fetch (uses per-page cache internally; returns fresh data if live)
  const detail = await fetchGameDetail(slug, year, mmdd);

  const status: GameStatus = detail?.status ?? game.status;
  const isLive = status === 'live';

  return {
    ...game,
    status,
    currentInning: isLive ? (detail?.inning ?? game.currentInning) : undefined,
    inningHalf: isLive ? (detail?.half ?? game.inningHalf) : undefined,
    linescore: detail?.linescore?.length
      ? detail.linescore
      : game.linescore,
    homeHits: detail?.homeHits ?? game.homeHits,
    awayHits: detail?.awayHits ?? game.awayHits,
    homeErrors: detail?.homeErrors ?? game.homeErrors,
    awayErrors: detail?.awayErrors ?? game.awayErrors,
    venue: detail?.venue,
    homeColor: game.homeTeam.primaryColor,
    awayColor: game.awayTeam.primaryColor,
  };
}
