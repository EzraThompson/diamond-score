/**
 * NCAA D1 College Baseball Data Source
 *
 * Uses ESPN's public scoreboard API — the MLB Stats API (sportId=16)
 * returns zero games for college baseball.
 *
 * API: https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard
 *
 * NOTE: Conference grouping is NOT available in the scoreboard response.
 * ESPN embeds `conferenceCompetition: boolean` per game but does not include
 * the conference name. Doing so would require per-team API lookups (N+1 calls).
 * Games are returned in a single flat list, sorted live → final → scheduled.
 */

import { gameCache } from '../cache';
import type {
  BatterLine,
  Game,
  GameDetail,
  GameStatus,
  InningHalf,
  League,
  LinescoreInning,
  PitcherLine,
  PlayerInfo,
  RunnersOn,
  Team,
} from '../types';

// ── Constants ────────────────────────────────────────────────────────

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball';

export const NCAA_LEAGUE: League = {
  id: 16,
  name: 'College Baseball',
  country: 'USA',
};

// ── ESPN API response types ──────────────────────────────────────────

interface ESPNScoreboard {
  events: ESPNEvent[];
}

interface ESPNEvent {
  id: string;
  competitions: ESPNCompetition[];
  status: ESPNStatus;
}

interface ESPNCompetition {
  startDate: string;
  conferenceCompetition: boolean;
  competitors: ESPNCompetitor[];
  status: ESPNStatus;
  situation?: ESPNSituation;
}

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    color?: string;       // hex without '#'
    logo?: string;
  };
  score?: string;
  curatedRank?: { current: number }; // 99999 when unranked
  linescores?: { value: number; period: number }[];
  records?: { name: string; summary: string }[];
  hits?: number;
  errors?: number;
}

interface ESPNStatus {
  period: number; // = current inning (1-indexed)
  type: {
    name: string;   // e.g. "STATUS_FINAL", "STATUS_IN_PROGRESS"
    state: string;  // "pre" | "in" | "post"
    detail: string; // e.g. "Final", "Top 5th", "Bot 3rd"
  };
}

interface ESPNSituation {
  balls?: number;
  strikes?: number;
  outs?: number;
  onFirst?: object | boolean | null;  // ESPN uses false (not null) for empty bases
  onSecond?: object | boolean | null;
  onThird?: object | boolean | null;
}

// ── Mapping helpers ──────────────────────────────────────────────────

function mapStatus(typeName: string, state: string): GameStatus {
  if (typeName === 'STATUS_POSTPONED' || typeName === 'STATUS_CANCELED' || typeName === 'STATUS_SUSPENDED') {
    return 'postponed';
  }
  if (typeName === 'STATUS_DELAYED') return 'delayed';

  if (state === 'in') return 'live';
  if (state === 'post') return 'final';
  return 'scheduled';
}

/**
 * ESPN live status detail looks like "Top 5th", "Bot 3rd", "Mid 7th", "End 9th".
 * "Mid" = top half just ended; "End" = bottom half just ended.
 */
function mapInningHalf(detail: string): InningHalf | undefined {
  const lower = detail.toLowerCase();
  if (lower.startsWith('top')) return 'top';
  if (lower.startsWith('bot')) return 'bottom';
  if (lower.startsWith('mid')) return 'mid';
  if (lower.startsWith('end')) return 'end';
  return undefined;
}

function parseRecord(records?: { name: string; summary: string }[]): { wins?: number; losses?: number } {
  if (!records?.length) return {};
  // ESPN uses 'overall' for most sports but 'total' for some college sports.
  // Fall back to the first available entry so we never silently drop a record.
  const entry =
    records.find((r) => r.name === 'overall') ??
    records.find((r) => r.name === 'total') ??
    records[0];
  if (!entry?.summary) return {};
  const match = entry.summary.match(/^(\d+)-(\d+)/);
  if (!match) return {};
  return { wins: parseInt(match[1], 10), losses: parseInt(match[2], 10) };
}

/**
 * Fetches the current-season W/L record for a single ESPN team ID directly
 * from the team endpoint. Used as a fallback when the scoreboard response
 * omits records for a team. Cached 1 hour.
 */
async function fetchTeamRecord(teamId: number): Promise<{ wins?: number; losses?: number }> {
  const cacheKey = `ncaa:record:${teamId}`;
  const cached = gameCache.get<{ wins?: number; losses?: number }>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${ESPN_BASE}/teams/${teamId}`, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      team?: {
        record?: {
          items?: { type: { name: string }; summary?: string; wins?: number; losses?: number }[];
        };
      };
    };
    const items = data.team?.record?.items ?? [];
    const item =
      items.find((i) => i.type?.name === 'total' || i.type?.name === 'overall') ?? items[0];
    if (!item) return {};

    let wins   = item.wins;
    let losses = item.losses;
    if (wins === undefined && item.summary) {
      const m = item.summary.match(/^(\d+)-(\d+)/);
      if (m) { wins = parseInt(m[1], 10); losses = parseInt(m[2], 10); }
    }
    const result = { wins, losses };
    gameCache.set(cacheKey, result, 3600);
    return result;
  } catch {
    return {};
  }
}

function parseTeam(c: ESPNCompetitor): Team {
  const rank = c.curatedRank?.current;
  return {
    id: parseInt(c.team.id),
    name: c.team.displayName,
    abbreviation: c.team.abbreviation,
    logoUrl: c.team.logo,
    primaryColor: c.team.color ? `#${c.team.color}` : undefined,
    rank: rank && rank <= 25 ? rank : undefined,
    ...parseRecord(c.records),
  };
}

function parseLinescore(
  home: ESPNCompetitor,
  away: ESPNCompetitor,
): LinescoreInning[] | undefined {
  const homeLs = home.linescores ?? [];
  const awayLs = away.linescores ?? [];
  if (!homeLs.length && !awayLs.length) return undefined;

  const maxPeriod = Math.max(
    ...homeLs.map((l) => l.period),
    ...awayLs.map((l) => l.period),
    0,
  );
  if (maxPeriod === 0) return undefined;

  const homeByPeriod: Record<number, number> = Object.fromEntries(
    homeLs.map((l) => [l.period, l.value]),
  );
  const awayByPeriod: Record<number, number> = Object.fromEntries(
    awayLs.map((l) => [l.period, l.value]),
  );

  const innings: LinescoreInning[] = [];
  for (let i = 1; i <= maxPeriod; i++) {
    innings.push({
      inning: i,
      home: homeByPeriod[i] ?? null,
      away: awayByPeriod[i] ?? null,
    });
  }
  return innings;
}

function parseRunners(situation?: ESPNSituation): RunnersOn | undefined {
  if (!situation) return undefined;
  return {
    first: !!situation.onFirst,
    second: !!situation.onSecond,
    third: !!situation.onThird,
  };
}

// ── ESPN Summary API types (used by getNCAAGameDetail) ───────────────

interface ESPNSummaryCompetitorTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  color?: string;
  logos?: { href: string; rel?: string[] }[];
}

interface ESPNSummaryCompetitor {
  homeAway: 'home' | 'away';
  winner?: boolean;
  team: ESPNSummaryCompetitorTeam;
  score?: string;
  rank?: number;   // AP rank directly (no curatedRank wrapper in summary)
  records?: { name: string; summary: string }[];
  hits?: number;
  errors?: number;
}

interface ESPNSummaryCompetition {
  date: string;
  status: ESPNStatus;
  competitors: ESPNSummaryCompetitor[];
  situation?: ESPNSituation;
}

interface ESPNPlay {
  type?: { id: string; text: string };
  text?: string;
  period?: { type: string; number: number }; // type: "Top" | "Bottom"
  batOrder?: number;
  participants?: { athlete: { id: string }; type: 'pitcher' | 'batter' }[];
}

interface ESPNRosterEntry {
  subbedOut: boolean;
  batOrder: number; // 1-9 for starters, 0 for pitchers without a bat slot
  athlete: {
    id: string;
    shortName: string;    // "F. LastName"
    displayName: string;  // "First LastName"
  };
}

interface ESPNRoster {
  homeAway: 'home' | 'away';
  team: { id: string };
  roster?: ESPNRosterEntry[];
}

// ── ESPN Boxscore types ──────────────────────────────────────────────

interface ESPNBoxscoreAthlete {
  athlete: { id: string; displayName: string };
  stats: string[];
}

interface ESPNBoxscoreStatistic {
  name: string;    // "batting" | "pitching"
  labels: string[];
  athletes: ESPNBoxscoreAthlete[];
}

interface ESPNBoxscoreTeamEntry {
  team: { id: string };
  homeAway?: 'home' | 'away';
  statistics: ESPNBoxscoreStatistic[];
}

interface ESPNBoxscore {
  players?: ESPNBoxscoreTeamEntry[];
}

interface ESPNSummary {
  header?: {
    competitions?: ESPNSummaryCompetition[];
  };
  gameInfo?: {
    venue?: { fullName?: string };
  };
  plays?: ESPNPlay[];
  rosters?: ESPNRoster[];
  boxscore?: ESPNBoxscore;
}

// ── Boxscore parsers ──────────────────────────────────────────────────

function idx(labels: string[], label: string): number {
  return labels.indexOf(label);
}

function num(stats: string[], i: number): number {
  return i >= 0 ? parseInt(stats[i] ?? '') || 0 : 0;
}

function parseBattingLines(stat: ESPNBoxscoreStatistic): BatterLine[] {
  const labels = stat.labels;
  const abI  = idx(labels, 'AB');
  const rI   = idx(labels, 'R');
  const hI   = idx(labels, 'H');
  const rbiI = idx(labels, 'RBI');
  const bbI  = idx(labels, 'BB');
  const soI  = idx(labels, 'SO');
  const avgI = idx(labels, 'AVG');

  return stat.athletes
    .filter((a) => a.stats.length > 0)
    .map((a) => ({
      id:       parseInt(a.athlete.id) || 0,
      name:     a.athlete.displayName,
      position: '',
      atBats:   num(a.stats, abI),
      runs:     num(a.stats, rI),
      hits:     num(a.stats, hI),
      rbi:      num(a.stats, rbiI),
      bb:       num(a.stats, bbI),
      so:       num(a.stats, soI),
      avg:      avgI >= 0 ? (a.stats[avgI] ?? '.---') : '.---',
    }));
}

function parsePitchingLines(stat: ESPNBoxscoreStatistic): PitcherLine[] {
  const labels = stat.labels;
  const ipI  = idx(labels, 'IP');
  const hI   = idx(labels, 'H');
  const rI   = idx(labels, 'R');
  const erI  = idx(labels, 'ER');
  const bbI  = idx(labels, 'BB');
  const soI  = idx(labels, 'SO');
  const eraI = idx(labels, 'ERA');

  return stat.athletes
    .filter((a) => a.stats.length > 0)
    .map((a) => ({
      id:   parseInt(a.athlete.id) || 0,
      name: a.athlete.displayName,
      ip:   ipI  >= 0 ? (a.stats[ipI]  ?? '0')    : '0',
      hits: num(a.stats, hI),
      runs: num(a.stats, rI),
      er:   num(a.stats, erI),
      bb:   num(a.stats, bbI),
      so:   num(a.stats, soI),
      era:  eraI >= 0 ? (a.stats[eraI] ?? '-.--') : '-.--',
    }));
}

function parseSummaryTeam(c: ESPNSummaryCompetitor): Team {
  const logo =
    c.team.logos?.find((l) => l.rel?.includes('default'))?.href ??
    c.team.logos?.[0]?.href;
  return {
    id: parseInt(c.team.id),
    name: c.team.displayName,
    abbreviation: c.team.abbreviation,
    logoUrl: logo,
    primaryColor: c.team.color ? `#${c.team.color}` : undefined,
    rank: c.rank && c.rank <= 25 ? c.rank : undefined,
    ...parseRecord(c.records),
  };
}

/**
 * Parse current pitcher, batter, and on-deck batter from ESPN play-by-play.
 *
 * Strategy:
 *   - Pitcher + batter names: scraped from the text of the last "Start
 *     Batter/Pitcher" play (type.id === "1"). Text format is always
 *     "F. LastName pitches to F. LastName". This covers relief pitchers and
 *     pinch hitters who may not appear in the starting-lineup roster.
 *   - On-deck batter: looked up in the batting team's roster by batOrder.
 *     Current batOrder comes from the play's `batOrder` field; next is
 *     (currentBatOrder % 9) + 1 with wrap-around.
 *   - Batting team: determined by `period.type` ("Top" = away bats, "Bottom" = home bats).
 */
function parseMatchup(
  plays: ESPNPlay[],
  rosters: ESPNRoster[],
): { currentPitcher?: PlayerInfo; currentBatter?: PlayerInfo; onDeckBatter?: PlayerInfo } {
  // Walk backwards to find the last at-bat start event
  let lastAB: ESPNPlay | undefined;
  for (let i = plays.length - 1; i >= 0; i--) {
    if (plays[i].type?.id === '1') { lastAB = plays[i]; break; }
  }
  if (!lastAB?.text) return {};

  // Parse names directly from play text (covers subs that aren't in starter roster)
  const PITCHES_TO = ' pitches to ';
  const splitIdx = lastAB.text.indexOf(PITCHES_TO);
  if (splitIdx === -1) return {};

  const pitcherName = lastAB.text.slice(0, splitIdx).trim();
  const batterName  = lastAB.text.slice(splitIdx + PITCHES_TO.length).trim();

  // Build athlete → { batOrder, homeAway } map for on-deck lookup
  const athleteInfo = new Map<string, { batOrder: number; homeAway: string }>();
  for (const roster of rosters) {
    for (const entry of roster.roster ?? []) {
      athleteInfo.set(entry.athlete.id, {
        batOrder: entry.batOrder,
        homeAway: roster.homeAway,
      });
    }
  }

  // Determine current batOrder: prefer play.batOrder, fall back to roster lookup
  const batterParticipant = lastAB.participants?.find((p) => p.type === 'batter');
  const currentBatOrder =
    lastAB.batOrder ??
    (batterParticipant ? athleteInfo.get(batterParticipant.athlete.id)?.batOrder : undefined) ??
    0;

  // On-deck: next in batting order (1→2→…→9→1)
  let onDeckBatter: PlayerInfo | undefined;
  if (currentBatOrder > 0) {
    const nextBatOrder = (currentBatOrder % 9) + 1;
    const isTop = lastAB.period?.type === 'Top';
    const battingHomeAway = isTop ? 'away' : 'home';
    const battingRoster = rosters.find((r) => r.homeAway === battingHomeAway);
    const onDeckEntry = battingRoster?.roster?.find(
      (r) => r.batOrder === nextBatOrder && !r.subbedOut,
    );
    if (onDeckEntry) {
      onDeckBatter = {
        id: parseInt(onDeckEntry.athlete.id),
        name: onDeckEntry.athlete.shortName || onDeckEntry.athlete.displayName,
      };
    }
  }

  return {
    currentPitcher: pitcherName ? { id: 0, name: pitcherName } : undefined,
    currentBatter:  batterName  ? { id: 0, name: batterName  } : undefined,
    onDeckBatter,
  };
}

/** Sort order: live (0) → final (1) → scheduled (2) → postponed/delayed (3) */
const STATUS_ORDER: Record<GameStatus, number> = {
  live: 0,
  final: 1,
  scheduled: 2,
  postponed: 3,
  delayed: 3,
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Fetch NCAA D1 college baseball games for a given date (YYYY-MM-DD).
 * Returns all games sorted live → final → scheduled.
 * Cached 30s if any live games, 15min otherwise.
 */
export async function getNCAAGames(date: string): Promise<Game[]> {
  const cacheKey = `ncaa:${date}`;
  const cached = gameCache.get<Game[]>(cacheKey);
  if (cached) return cached;

  // ESPN uses YYYYMMDD with no separator
  const espnDate = date.replace(/-/g, '');

  const res = await fetch(
    `${ESPN_BASE}/scoreboard?dates=${espnDate}&limit=500`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`ESPN API ${res.status}: college-baseball scoreboard`);

  const data = (await res.json()) as ESPNScoreboard;
  const events = data.events ?? [];

  const games: Game[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const status = mapStatus(event.status.type.name, event.status.type.state);
    const isLive = status === 'live';

    const game: Game = {
      id: parseInt(event.id),
      league: NCAA_LEAGUE,
      status,
      scheduledTime: comp.startDate,
      homeTeam: parseTeam(home),
      awayTeam: parseTeam(away),
      homeScore: parseInt(home.score ?? '0') || 0,
      awayScore: parseInt(away.score ?? '0') || 0,
      currentInning: isLive ? event.status.period : undefined,
      inningHalf: isLive ? mapInningHalf(event.status.type.detail) : undefined,
      linescore: parseLinescore(home, away),
      homeHits: home.hits,
      awayHits: away.hits,
      homeErrors: home.errors,
      awayErrors: away.errors,
    };

    // Enrich live games with count/runners from the situation block.
    // ESPN doesn't always provide balls/strikes/outs — only set count when
    // at least one is explicitly present, otherwise we'd show fake zeros.
    if (isLive && comp.situation) {
      const sit = comp.situation;
      game.runnersOn = parseRunners(sit);
      if (sit.outs !== undefined || sit.balls !== undefined || sit.strikes !== undefined) {
        const outs = sit.outs ?? 0;
        game.outs = outs;
        game.count = {
          balls: sit.balls ?? 0,
          strikes: sit.strikes ?? 0,
          outs,
        };
      }
    }

    games.push(game);
  }

  // ── Fallback: batch-fetch records for teams the scoreboard didn't include ──
  // ESPN's scoreboard omits records for some teams (untracked schools, 0-0 teams,
  // or when using 'total' vs 'overall' naming wasn't enough). Deduplicate by team
  // ID and fetch only what's still missing.
  const missingTeamIds = new Set<number>();
  for (const g of games) {
    if (g.homeTeam.wins === undefined) missingTeamIds.add(g.homeTeam.id);
    if (g.awayTeam.wins === undefined) missingTeamIds.add(g.awayTeam.id);
  }

  if (missingTeamIds.size > 0) {
    const fetched = await Promise.all(
      Array.from(missingTeamIds).map((id) => fetchTeamRecord(id).then((r) => [id, r] as const)),
    );
    const recordMap = new Map(fetched);

    for (const g of games) {
      if (g.homeTeam.wins === undefined) {
        const r = recordMap.get(g.homeTeam.id);
        if (r?.wins !== undefined) g.homeTeam = { ...g.homeTeam, ...r };
      }
      if (g.awayTeam.wins === undefined) {
        const r = recordMap.get(g.awayTeam.id);
        if (r?.wins !== undefined) g.awayTeam = { ...g.awayTeam, ...r };
      }
    }
  }

  // Sort: live → final → scheduled → postponed
  games.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );

  const hasLive = games.some((g) => g.status === 'live');
  // Live games: 30s TTL. No live games: 2-min TTL to catch game start promptly.
  gameCache.set(cacheKey, games, hasLive ? 30 : 120);

  return games;
}

/**
 * Fetch NCAA game detail for the game detail page.
 * Uses ESPN's summary API for status/teams/venue/situation.
 * Piggybacks on getNCAAGames() (likely a cache hit) to get linescore data,
 * since linescores are not included in the summary endpoint.
 * Cached 30s for live games, 5min for finished.
 */
export async function getNCAAGameDetail(id: number): Promise<GameDetail> {
  const cacheKey = `ncaa:detail:${id}`;
  const cached = gameCache.get<GameDetail>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${ESPN_BASE}/summary?event=${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN summary API ${res.status}: event=${id}`);

  const data = (await res.json()) as ESPNSummary;
  const headerComp = data.header?.competitions?.[0];
  if (!headerComp) throw new Error('ESPN summary missing competition data');

  const competitors = headerComp.competitors;
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) throw new Error('ESPN summary missing competitor data');

  const status = mapStatus(headerComp.status.type.name, headerComp.status.type.state);
  const isLive = status === 'live';

  const homeTeam = parseSummaryTeam(home);
  const awayTeam = parseSummaryTeam(away);

  // Get linescore by fetching the scoreboard for this game's date.
  // getNCAAGames() is likely a cache hit if the user came from the scores page.
  const gameDate = headerComp.date.slice(0, 10); // YYYY-MM-DD
  let linescore: LinescoreInning[] | undefined;
  let homeHits: number | undefined = home.hits;
  let awayHits: number | undefined = away.hits;
  let homeErrors: number | undefined = home.errors;
  let awayErrors: number | undefined = away.errors;

  // Fetch scoreboard for this game's date (likely a cache hit when the user
  // navigated from the scores page). The scoreboard includes:
  //   - per-inning linescores (summary endpoint omits these)
  //   - situation block with balls/strikes/outs/runners (summary omits this too)
  let scoreboard: Game | undefined;
  try {
    const games = await getNCAAGames(gameDate);
    scoreboard = games.find((g) => g.id === id);
    if (scoreboard) {
      linescore   = scoreboard.linescore;
      homeHits    = scoreboard.homeHits    ?? homeHits;
      awayHits    = scoreboard.awayHits    ?? awayHits;
      homeErrors  = scoreboard.homeErrors  ?? homeErrors;
      awayErrors  = scoreboard.awayErrors  ?? awayErrors;
    }
  } catch {
    // Non-fatal — detail page still works without it
  }

  const detail: GameDetail = {
    id,
    league: NCAA_LEAGUE,
    status,
    scheduledTime: headerComp.date,
    homeTeam,
    awayTeam,
    homeScore: parseInt(home.score ?? '0') || 0,
    awayScore: parseInt(away.score ?? '0') || 0,
    currentInning: isLive ? headerComp.status.period : undefined,
    inningHalf: isLive ? mapInningHalf(headerComp.status.type.detail) : undefined,
    linescore,
    homeHits,
    awayHits,
    homeErrors,
    awayErrors,
    venue: data.gameInfo?.venue?.fullName,
    homeColor: homeTeam.primaryColor,
    awayColor: awayTeam.primaryColor,
  };

  if (isLive) {
    // Priority 1: situation block from the summary endpoint (rarely populated)
    if (headerComp.situation) {
      const sit = headerComp.situation;
      detail.runnersOn = parseRunners(sit);
      if (sit.outs !== undefined || sit.balls !== undefined || sit.strikes !== undefined) {
        const outs = sit.outs ?? 0;
        detail.outs = outs;
        detail.count = { balls: sit.balls ?? 0, strikes: sit.strikes ?? 0, outs };
      }
    }
    // Priority 2: situation data from the scoreboard (more reliably present
    // than the summary's situation block)
    if (scoreboard) {
      if (!detail.count     && scoreboard.count)              detail.count     = scoreboard.count;
      if (!detail.runnersOn && scoreboard.runnersOn)          detail.runnersOn = scoreboard.runnersOn;
      if (detail.outs === undefined && scoreboard.outs !== undefined) detail.outs = scoreboard.outs;
    }

    // Priority 3: current pitcher / batter / on-deck from play-by-play
    const plays   = data.plays   ?? [];
    const rosters = data.rosters ?? [];
    if (plays.length > 0 && rosters.length > 0) {
      const matchup = parseMatchup(plays, rosters);
      if (matchup.currentPitcher) detail.currentPitcher = matchup.currentPitcher;
      if (matchup.currentBatter)  detail.currentBatter  = matchup.currentBatter;
      if (matchup.onDeckBatter)   detail.onDeckBatter   = matchup.onDeckBatter;
    }
  }

  // ── Box score from ESPN summary (works for live and final) ──────────
  // ESPN's summary endpoint includes a `boxscore.players` array with per-player
  // batting and pitching lines.  Available for both live and completed games.
  const boxscorePlayers = data.boxscore?.players ?? [];
  if (boxscorePlayers.length > 0) {
    const homeId = String(home.team.id);
    let homeBatting:  BatterLine[]  = [];
    let homePitching: PitcherLine[] = [];
    let awayBatting:  BatterLine[]  = [];
    let awayPitching: PitcherLine[] = [];

    for (const teamEntry of boxscorePlayers) {
      const teamId = String(teamEntry.team.id);
      const isHome = teamId === homeId;

      for (const stat of teamEntry.statistics) {
        if (stat.name === 'batting') {
          const lines = parseBattingLines(stat);
          if (isHome) homeBatting  = lines;
          else        awayBatting  = lines;
        } else if (stat.name === 'pitching') {
          const lines = parsePitchingLines(stat);
          if (isHome) homePitching = lines;
          else        awayPitching = lines;
        }
      }
    }

    if (homeBatting.length || awayBatting.length) {
      detail.batting  = { home: homeBatting,  away: awayBatting  };
    }
    if (homePitching.length || awayPitching.length) {
      detail.pitching = { home: homePitching, away: awayPitching };
    }
  }

  const ttl = status === 'live' ? 30 : 300;
  gameCache.set(cacheKey, detail, ttl);

  return detail;
}
