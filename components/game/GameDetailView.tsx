'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Diamond from '@/components/Diamond';
import TeamBadge from '@/components/TeamBadge';
import type { GameDetail, BatterLine, PitcherLine, PlayEvent } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function lastName(fullName: string) {
  return fullName.split(' ').pop() ?? fullName;
}

// ── Header ─────────────────────────────────────────────────────────────

function GameHeader({ detail, onBack }: { detail: GameDetail; onBack: () => void }) {
  const isLive = detail.status === 'live';
  const isFinal = detail.status === 'final';

  const homeColor = detail.homeColor ?? '#18A34A';
  const awayColor = detail.awayColor ?? '#18A34A';

  let statusLine = '';
  if (isLive) {
    const half = detail.inningHalf === 'top' ? 'Top' : detail.inningHalf === 'bottom' ? 'Bot' : 'Mid';
    statusLine = `${half} ${getOrdinal(detail.currentInning ?? 0)}`;
  } else if (isFinal) {
    const extra = detail.linescore && detail.linescore.length > 9 ? `/${detail.linescore.length}` : '';
    statusLine = `Final${extra}`;
  } else if (detail.status === 'postponed') {
    statusLine = 'Postponed';
  } else if (detail.status === 'delayed') {
    statusLine = 'Delayed';
  } else if (detail.scheduledTime) {
    statusLine = format(new Date(detail.scheduledTime), 'h:mm a');
  } else {
    statusLine = 'Scheduled';
  }

  return (
    <div className="relative overflow-hidden bg-surface-50 border-b border-surface-200">
      {/* Subtle team-color tints */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(135deg, ${awayColor}40 0%, transparent 50%, ${homeColor}40 100%)`,
        }}
      />

      {/* Back button */}
      <div className="relative z-10 flex items-center px-4 pt-3 pb-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Scores
        </button>
        {detail.venue && (
          <span className="ml-auto text-[11px] text-gray-400 truncate max-w-[160px]">
            {detail.venue}
          </span>
        )}
      </div>

      {/* Score block */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        {/* Away team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <TeamBadge abbreviation={detail.awayTeam.abbreviation} primaryColor={detail.awayColor} size="lg" />
          <span className="text-sm font-bold text-gray-500">{detail.awayTeam.abbreviation}</span>
          <span className="text-3xl font-black tabular-nums font-mono text-gray-900">{detail.awayScore}</span>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-1 px-4">
          {isLive && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="relative flex items-center justify-center w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-live opacity-40 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-live" />
              </span>
              <span className="text-xs font-bold text-live">LIVE</span>
            </div>
          )}
          <span className={`text-sm font-semibold ${
            isLive ? 'text-live' : isFinal ? 'text-gray-500' : 'text-gray-500'
          }`}>
            {statusLine}
          </span>
          {isLive && detail.outs !== undefined && (
            <div className="flex gap-0.5 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < (detail.outs ?? 0) ? 'bg-yellow-400' : 'bg-surface-200'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Home team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <TeamBadge abbreviation={detail.homeTeam.abbreviation} primaryColor={detail.homeColor} size="lg" />
          <span className="text-sm font-bold text-gray-500">{detail.homeTeam.abbreviation}</span>
          <span className="text-3xl font-black tabular-nums font-mono text-gray-900">{detail.homeScore}</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────

type TabKey = 'linescore' | 'boxscore' | 'pbp';

function TabBar({
  active,
  onChange,
  showPbp,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  showPbp: boolean;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'linescore', label: 'Gamecast' },
    { key: 'boxscore', label: 'Box Score' },
    ...(showPbp ? [{ key: 'pbp' as TabKey, label: 'Plays' }] : []),
  ];

  return (
    <div className="flex border-b border-surface-200 bg-surface-50">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
            active === t.key
              ? 'text-accent border-b-2 border-accent -mb-px'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Linescore tab ──────────────────────────────────────────────────────

function LinescoreTab({ detail }: { detail: GameDetail }) {
  const innings = detail.linescore ?? [];
  const cols = Math.max(9, innings.length);
  const numbers = Array.from({ length: cols }, (_, i) => i + 1);

  return (
    <div className="px-2 pt-3">
      <div className="overflow-x-auto no-scrollbar bg-surface-50 rounded-xl p-3 border border-surface-200">
        <table className="linescore-table text-xs text-gray-500 w-full">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-semibold w-10 pr-2" />
              {numbers.map((n) => (
                <th key={n} className="font-semibold">{n}</th>
              ))}
              <th className="font-semibold pl-2 border-l border-surface-200 text-gray-500">R</th>
              <th className="font-semibold text-gray-500">H</th>
              <th className="font-semibold text-gray-500">E</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: detail.awayTeam.abbreviation,
                score: detail.awayScore,
                hits: detail.awayHits ?? 0,
                errors: detail.awayErrors ?? 0,
                side: 'away' as const,
              },
              {
                label: detail.homeTeam.abbreviation,
                score: detail.homeScore,
                hits: detail.homeHits ?? 0,
                errors: detail.homeErrors ?? 0,
                side: 'home' as const,
              },
            ].map((row) => (
              <tr key={row.side} className="text-gray-500">
                <td className="text-left font-bold text-[11px] text-gray-800 pr-2">{row.label}</td>
                {numbers.map((n) => {
                  const inn = innings.find((i) => i.inning === n);
                  const val = inn != null ? (row.side === 'away' ? inn.away : inn.home) : undefined;
                  // val === null  → team didn't bat that half-inning (walk-off, etc.) → '-'
                  // val === undefined → inning not yet reached → '-'
                  // val === 0    → team batted, scored 0 → '0'
                  const isEmpty = val === null || val === undefined;
                  return (
                    <td key={n} className={isEmpty ? 'text-gray-300' : ''}>
                      {isEmpty ? '-' : val}
                    </td>
                  );
                })}
                <td className="font-bold pl-2 border-l border-surface-200 text-gray-900 font-mono">{row.score}</td>
                <td className="font-mono">{row.hits}</td>
                <td className="font-mono">{row.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.status === 'live' && (
        detail.currentPitcher ||
        detail.currentBatter ||
        detail.count ||
        (detail.runnersOn && (detail.runnersOn.first || detail.runnersOn.second || detail.runnersOn.third))
      ) && (
        <LiveSituation detail={detail} />
      )}

      {detail.status === 'live' && (detail.plays?.length ?? 0) > 0 && (
        <RecentPlaysTicker plays={detail.plays!} />
      )}
    </div>
  );
}

// ── Live situation ─────────────────────────────────────────────────────

function LiveSituation({ detail }: { detail: GameDetail }) {
  const hasCount = !!detail.count;
  const runners = detail.runnersOn ?? { first: false, second: false, third: false };

  return (
    <div className="mt-3 bg-surface-50 rounded-xl p-3 border border-surface-200">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        Current Situation
      </p>

      <div className="flex items-center gap-4">
        <Diamond runners={runners} size={52} />

        <div className="flex-1 space-y-1.5">
          {detail.currentPitcher && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">P</span>
              <span className="text-xs text-gray-600">{detail.currentPitcher.name}</span>
            </div>
          )}
          {detail.currentBatter && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">AB</span>
              <span className="text-xs text-gray-900 font-semibold">{detail.currentBatter.name}</span>
            </div>
          )}
          {detail.onDeckBatter && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">OD</span>
              <span className="text-xs text-gray-500">{detail.onDeckBatter.name}</span>
            </div>
          )}
          {hasCount && (
            <div className="flex items-center gap-3 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">B-S</span>
                <span className="text-sm font-semibold tabular-nums font-mono text-gray-700">
                  {detail.count!.balls}-{detail.count!.strikes}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">Out{detail.outs !== 1 ? 's' : ''}</span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < (detail.outs ?? 0) ? 'bg-yellow-400' : 'bg-surface-200'
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {detail.lastPlayDescription && (
        <p className="mt-2 pt-2 border-t border-surface-200 text-[11px] text-gray-500 leading-relaxed">
          {detail.lastPlayDescription}
        </p>
      )}
    </div>
  );
}

// ── Box score tab ──────────────────────────────────────────────────────

function BattingTable({ label, batters }: { label: string; batters: BatterLine[] }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 pb-1.5">
        {label} Batting
      </p>
      <div className="bg-surface-50 rounded-xl overflow-x-auto no-scrollbar border border-surface-200">
        <table className="linescore-table text-xs w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-surface-200">
              <th className="text-left py-2 pl-3 pr-1 font-semibold w-28">Player</th>
              <th className="font-semibold">AB</th>
              <th className="font-semibold">R</th>
              <th className="font-semibold">H</th>
              <th className="font-semibold">RBI</th>
              <th className="font-semibold">BB</th>
              <th className="font-semibold">SO</th>
              <th className="font-semibold pr-2">AVG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {batters.map((b) => (
              <tr key={b.id} className="text-gray-500">
                <td className="py-1.5 pl-3 pr-1 text-left">
                  <span className="text-gray-900 font-semibold">{lastName(b.name)}</span>
                  <span className="text-gray-400 text-[10px] ml-1">{b.position}</span>
                </td>
                <td className="tabular-nums font-mono">{b.atBats}</td>
                <td className="tabular-nums font-mono">{b.runs}</td>
                <td className="tabular-nums font-mono font-semibold text-gray-700">{b.hits}</td>
                <td className="tabular-nums font-mono">{b.rbi}</td>
                <td className="tabular-nums font-mono">{b.bb}</td>
                <td className="tabular-nums font-mono">{b.so}</td>
                <td className="tabular-nums font-mono pr-2 text-gray-400">{b.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PitchingTable({ label, pitchers }: { label: string; pitchers: PitcherLine[] }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 pb-1.5">
        {label} Pitching
      </p>
      <div className="bg-surface-50 rounded-xl overflow-x-auto no-scrollbar border border-surface-200">
        <table className="linescore-table text-xs w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-surface-200">
              <th className="text-left py-2 pl-3 pr-1 font-semibold w-28">Pitcher</th>
              <th className="font-semibold">IP</th>
              <th className="font-semibold">H</th>
              <th className="font-semibold">R</th>
              <th className="font-semibold">ER</th>
              <th className="font-semibold">BB</th>
              <th className="font-semibold">SO</th>
              <th className="font-semibold pr-2">ERA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {pitchers.map((p) => (
              <tr key={p.id} className="text-gray-500">
                <td className="py-1.5 pl-3 pr-1 text-left">
                  <span className="text-gray-900 font-semibold">{lastName(p.name)}</span>
                  {p.note && (
                    <span className="ml-1 text-[10px] font-bold text-accent">{p.note}</span>
                  )}
                </td>
                <td className="tabular-nums font-mono font-semibold text-gray-700">{p.ip}</td>
                <td className="tabular-nums font-mono">{p.hits}</td>
                <td className="tabular-nums font-mono">{p.runs}</td>
                <td className="tabular-nums font-mono">{p.er}</td>
                <td className="tabular-nums font-mono">{p.bb}</td>
                <td className="tabular-nums font-mono">{p.so}</td>
                <td className="tabular-nums font-mono pr-2 text-gray-400">{p.era}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoxScoreTab({ detail }: { detail: GameDetail }) {
  const [side, setSide] = useState<'away' | 'home'>('away');

  if (!detail.batting && !detail.pitching) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        Box score not available yet
      </div>
    );
  }

  const awayLabel = detail.awayTeam.abbreviation;
  const homeLabel = detail.homeTeam.abbreviation;

  return (
    <div className="px-2 pt-3">
      <div className="flex bg-surface-100 rounded-lg p-0.5 mb-3">
        {(['away', 'home'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
              side === s ? 'bg-surface-50 text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {s === 'away' ? awayLabel : homeLabel}
          </button>
        ))}
      </div>

      {side === 'away' ? (
        <>
          {detail.batting?.away && <BattingTable label={awayLabel} batters={detail.batting.away} />}
          {detail.pitching?.away && <PitchingTable label={awayLabel} pitchers={detail.pitching.away} />}
        </>
      ) : (
        <>
          {detail.batting?.home && <BattingTable label={homeLabel} batters={detail.batting.home} />}
          {detail.pitching?.home && <PitchingTable label={homeLabel} pitchers={detail.pitching.home} />}
        </>
      )}
    </div>
  );
}

// ── Recent plays ticker ────────────────────────────────────────────────

const TICKER_EVENT_COLORS: Record<string, string> = {
  'Home Run':             'text-yellow-500',
  'Triple':               'text-accent',
  'Double':               'text-accent-light',
  'Single':               'text-gray-700',
  'Walk':                 'text-blue-500',
  'Strikeout':            'text-red-400',
  'Strikeout - Swinging': 'text-red-400',
  'Strikeout - Looking':  'text-red-400',
};

function RecentPlaysTicker({ plays }: { plays: PlayEvent[] }) {
  if (!plays.length) return null;
  const recent = [...plays].slice(-5).reverse();

  return (
    <div className="mt-3 bg-surface-50 rounded-xl border border-surface-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
        <span className="relative flex items-center justify-center w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-live opacity-40 animate-ping" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-live" />
        </span>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Recent Plays
        </p>
      </div>
      <div className="divide-y divide-surface-100">
        {recent.map((play) => {
          const halfLabel = play.half === 'top' ? '▲' : '▼';
          const colorClass = TICKER_EVENT_COLORS[play.event] ?? 'text-gray-600';
          return (
            <div key={play.id} className="flex items-start gap-2 px-3 py-2">
              <span className="text-[10px] text-gray-400 font-mono tabular-nums flex-shrink-0 mt-0.5 w-8">
                {halfLabel}{play.inning}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] font-bold ${colorClass}`}>{play.event}</span>
                {play.rbi > 0 && (
                  <span className="ml-1 text-[10px] text-yellow-500 font-semibold">{play.rbi} RBI</span>
                )}
                <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                  {play.description}
                </p>
              </div>
              {(play.awayScore > 0 || play.homeScore > 0) && (
                <span className="text-[10px] text-gray-400 font-mono tabular-nums flex-shrink-0 mt-0.5">
                  {play.awayScore}–{play.homeScore}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Play-by-Play tab ───────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  'Home Run':              'text-yellow-500',
  'Triple':                'text-accent',
  'Double':                'text-accent-light',
  'Single':                'text-gray-700',
  'Walk':                  'text-blue-500',
  'Strikeout':             'text-red-400',
  'Strikeout - Swinging':  'text-red-400',
  'Strikeout - Looking':   'text-red-400',
};

function PlayByPlayTab({ plays }: { plays: PlayEvent[] }) {
  if (!plays.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        No plays yet
      </div>
    );
  }

  const reversed = [...plays].reverse();
  let lastKey = '';

  return (
    <div className="px-2 pt-2 pb-4 space-y-0">
      {reversed.map((play) => {
        const key = `${play.inning}-${play.half}`;
        const showHeader = key !== lastKey;
        lastKey = key;
        const halfLabel = play.half === 'top' ? '▲' : '▼';

        return (
          <div key={play.id}>
            {showHeader && (
              <div className="flex items-center gap-2 pt-3 pb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {halfLabel} {getOrdinal(play.inning)}
                </span>
                <div className="flex-1 h-px bg-surface-200" />
              </div>
            )}
            <div className="bg-surface-50 rounded-lg px-3 py-2 mb-1 border border-surface-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className={`text-[11px] font-bold ${EVENT_COLORS[play.event] ?? 'text-gray-600'}`}>
                    {play.event}
                  </span>
                  {play.rbi > 0 && (
                    <span className="ml-1 text-[10px] text-yellow-500 font-semibold">
                      {play.rbi} RBI
                    </span>
                  )}
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    {play.description}
                  </p>
                </div>
                {(play.awayScore > 0 || play.homeScore > 0) && (
                  <span className="text-[10px] text-gray-400 font-mono tabular-nums flex-shrink-0 pt-0.5">
                    {play.awayScore}–{play.homeScore}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────

export default function GameDetailView({ id }: { id: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('linescore');

  const fetchDetail = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data: GameDetail = await res.json();
      setDetail(data);
    } catch {
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(true); }, [fetchDetail]);

  useEffect(() => {
    if (detail?.status !== 'live') return;
    const timer = setInterval(() => fetchDetail(false), 30_000);
    return () => clearInterval(timer);
  }, [detail?.status, fetchDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading game data…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-red-400">{error ?? 'Game not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-accent hover:underline font-semibold">
          Go back
        </button>
      </div>
    );
  }

  const hasPlays = (detail.plays?.length ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <GameHeader detail={detail} onBack={() => router.back()} />
      <TabBar active={tab} onChange={setTab} showPbp={hasPlays} />

      <div className="flex-1 overflow-y-auto">
        {tab === 'linescore' && <LinescoreTab detail={detail} />}
        {tab === 'boxscore' && <BoxScoreTab detail={detail} />}
        {tab === 'pbp' && <PlayByPlayTab plays={detail.plays ?? []} />}
      </div>
    </div>
  );
}
