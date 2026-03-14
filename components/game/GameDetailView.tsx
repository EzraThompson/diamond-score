'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Diamond from '@/components/Diamond';
import TeamBadge from '@/components/TeamBadge';
import FeedbackModal from '@/components/FeedbackModal';
import StarButton from '@/components/StarButton';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { GameDetail, BatterLine, PitcherLine, Pitch, PlayEvent, ScheduleNavGame } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv', 'v']);

function lastName(fullName: string) {
  const parts = fullName.split(' ');
  if (parts.length <= 1) return fullName;
  const last = parts[parts.length - 1];
  if (SUFFIXES.has(last.toLowerCase()) && parts.length > 2) {
    return parts[parts.length - 2] + ' ' + last;
  }
  return last;
}

// ── Header ─────────────────────────────────────────────────────────────

function GameHeader({ detail, onBack, isTeamFav, toggleTeam }: { detail: GameDetail; onBack: () => void; isTeamFav: (abbr: string) => boolean; toggleTeam: (abbr: string) => void }) {
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
          <TeamBadge abbreviation={detail.awayTeam.abbreviation} primaryColor={detail.awayColor} logoUrl={detail.awayTeam.logoUrl} showLogo={detail.league.id === 20} size="lg" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-500">{detail.awayTeam.abbreviation}</span>
            <StarButton active={isTeamFav(detail.awayTeam.abbreviation)} onToggle={() => toggleTeam(detail.awayTeam.abbreviation)} size={14} />
          </div>
          <span className="text-3xl font-black tabular-nums font-sans text-gray-900">{detail.awayScore}</span>
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
          <TeamBadge abbreviation={detail.homeTeam.abbreviation} primaryColor={detail.homeColor} logoUrl={detail.homeTeam.logoUrl} showLogo={detail.league.id === 20} size="lg" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-500">{detail.homeTeam.abbreviation}</span>
            <StarButton active={isTeamFav(detail.homeTeam.abbreviation)} onToggle={() => toggleTeam(detail.homeTeam.abbreviation)} size={14} />
          </div>
          <span className="text-3xl font-black tabular-nums font-sans text-gray-900">{detail.homeScore}</span>
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

      {detail.status === 'final' && (detail.winningPitcher || detail.losingPitcher) && (
        <GameDecisions detail={detail} />
      )}

      {(detail.plays?.length ?? 0) > 0 && (
        <RecentPlaysTicker plays={detail.plays!} />
      )}
    </div>
  );
}

// ── Strike zone ───────────────────────────────────────────────────────

const PLATE_HALF_W = 0.708; // 17 inches / 2 / 12 = feet
const ZONE_DEFAULT_TOP = 3.5;
const ZONE_DEFAULT_BOT = 1.5;

function pitchColor(p: Pitch): string {
  if (p.isBall) return '#22c55e';           // green — ball
  if (p.isInPlay) return '#3b82f6';          // blue — in play
  const c = p.call;
  if (c === 'C') return '#ef4444';           // red — called strike
  if ('SWT'.includes(c)) return '#ef4444';   // red — swinging strike
  if ('FLR'.includes(c)) return '#ef4444';   // red — foul
  return '#9ca3af';                          // gray fallback
}

function StrikeZone({ pitches, zoneTop, zoneBot }: {
  pitches: Pitch[];
  zoneTop: number;
  zoneBot: number;
}) {
  const top = zoneTop || ZONE_DEFAULT_TOP;
  const bot = zoneBot || ZONE_DEFAULT_BOT;
  const zoneH = top - bot;

  // Fixed bounds: zone + ~60% padding on each side — never changes with pitch positions
  const pad = zoneH * 0.6;
  const boundLeft = -(PLATE_HALF_W + pad);
  const boundRight = PLATE_HALF_W + pad;
  const boundTop = top + pad;
  const boundBot = bot - pad;

  // Clamp margin: pitches beyond this are clamped to the edge
  const r = 0.12;
  const clampL = boundLeft + r + 0.02;
  const clampR = boundRight - r - 0.02;
  const clampT = boundTop - r - 0.02;
  const clampB = boundBot + r + 0.02;

  const vW = boundRight - boundLeft;
  const vH = boundTop - boundBot;

  // Y is inverted: higher pZ = lower SVG y. ViewBox starts at 0.
  const toX = (pX: number) => pX;
  const toY = (pZ: number) => boundTop - pZ;

  const zoneLeft = -PLATE_HALF_W;
  const zoneRight = PLATE_HALF_W;
  const zoneW = zoneRight - zoneLeft;

  return (
    <svg
      viewBox={`${boundLeft} 0 ${vW} ${vH}`}
      className="w-24 h-24 flex-shrink-0 -mt-4"
    >
      {/* Zone background */}
      <rect
        x={zoneLeft} y={toY(top)} width={zoneW} height={zoneH}
        fill="rgba(0,0,0,0.03)" stroke="#d1d5db" strokeWidth={0.03}
      />
      {/* 3x3 grid */}
      {[1, 2].map((i) => (
        <line key={`h${i}`}
          x1={zoneLeft} y1={toY(bot + (zoneH * i) / 3)}
          x2={zoneRight} y2={toY(bot + (zoneH * i) / 3)}
          stroke="#e5e7eb" strokeWidth={0.015} strokeDasharray="0.04 0.04"
        />
      ))}
      {[1, 2].map((i) => (
        <line key={`v${i}`}
          x1={zoneLeft + (zoneW * i) / 3} y1={toY(top)}
          x2={zoneLeft + (zoneW * i) / 3} y2={toY(bot)}
          stroke="#e5e7eb" strokeWidth={0.015} strokeDasharray="0.04 0.04"
        />
      ))}
      {/* Pitch dots — clamped with arrows for outliers */}
      {pitches.map((p, i) => {
        const rawX = p.pX;
        const rawZ = p.pZ;
        const cx = Math.max(clampL, Math.min(clampR, toX(rawX)));
        const cy = Math.max(toY(clampT), Math.min(toY(clampB), toY(rawZ)));
        const color = pitchColor(p);

        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.85} />
            <text x={cx} y={cy + 0.045}
              textAnchor="middle" fontSize={0.11} fontWeight="bold" fill="white"
            >{i + 1}</text>
          </g>
        );
      })}
    </svg>
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

      <div className="flex items-start gap-3">
        {/* Left: Diamond + Count/Outs */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <Diamond runners={runners} size={48} />
          {hasCount && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums font-mono text-gray-700">
                {detail.count!.balls}-{detail.count!.strikes}
              </span>
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
          )}
        </div>

        {/* Middle: Strike zone (always visible) */}
        <StrikeZone
          pitches={detail.currentAtBatPitches ?? []}
          zoneTop={detail.strikeZoneTop ?? ZONE_DEFAULT_TOP}
          zoneBot={detail.strikeZoneBottom ?? ZONE_DEFAULT_BOT}
        />

        {/* Right: P / AB / OD */}
        <div className="flex-1 min-w-0 space-y-1">
          {detail.currentPitcher && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">P</span>
              <span className="text-xs text-gray-600 truncate">{detail.currentPitcher.name}</span>
            </div>
          )}
          {detail.currentBatter && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">AB</span>
              <span className="text-xs text-gray-900 font-semibold truncate">{detail.currentBatter.name}</span>
            </div>
          )}
          {detail.onDeckBatter && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 w-5 flex-shrink-0">OD</span>
              <span className="text-xs text-gray-500 truncate">{detail.onDeckBatter.name}</span>
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

// ── Game decisions (W/L/S for final games) ────────────────────────────

function GameDecisions({ detail }: { detail: GameDetail }) {
  return (
    <div className="mt-3 bg-surface-50 rounded-xl p-3 border border-surface-200">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        Pitching Decisions
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {detail.winningPitcher && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-accent w-3">W</span>
            <span className="text-xs text-gray-600">{detail.winningPitcher.name}</span>
          </div>
        )}
        {detail.losingPitcher && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-red-400 w-3">L</span>
            <span className="text-xs text-gray-600">{detail.losingPitcher.name}</span>
          </div>
        )}
        {detail.savePitcher && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-blue-500 w-3">S</span>
            <span className="text-xs text-gray-600">{detail.savePitcher.name}</span>
          </div>
        )}
      </div>
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
  // On base = blue
  'Home Run':             'text-blue-600',
  'Triple':               'text-blue-600',
  'Double':               'text-blue-600',
  'Single':               'text-blue-600',
  'Walk':                 'text-blue-600',
  'Hit By Pitch':         'text-blue-600',
  'Intent Walk':          'text-blue-600',
  // Outs = black
  'Strikeout':            'text-gray-900',
  'Strikeout - Swinging': 'text-gray-900',
  'Strikeout - Looking':  'text-gray-900',
  'Groundout':            'text-gray-900',
  'Flyout':               'text-gray-900',
  'Lineout':              'text-gray-900',
  'Pop Out':              'text-gray-900',
  'Forceout':             'text-gray-900',
  'Grounded Into DP':     'text-gray-900',
  'Double Play':          'text-gray-900',
  'Triple Play':          'text-gray-900',
  'Fielders Choice':      'text-gray-900',
  'Sac Fly':              'text-gray-900',
  'Sac Bunt':             'text-gray-900',
  'Sacrifice Fly':        'text-gray-900',
  'Sacrifice Bunt':       'text-gray-900',
  'Field Out':            'text-gray-900',
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
          const halfLabel = play.half === 'top' ? 'Top' : 'Bot';
          const colorClass = TICKER_EVENT_COLORS[play.event] ?? 'text-gray-600';
          return (
            <div key={play.id} className="px-3 py-2 grid items-baseline gap-x-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <span className="text-[10px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
                {halfLabel} {play.inning}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[11px] font-bold ${colorClass}`}>{play.event}</span>
                {play.rbi > 0 && (
                  <span className="text-[10px] text-accent font-semibold">{play.rbi} RBI</span>
                )}
              </div>
              <div />
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {play.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Play-by-Play tab ───────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  // On base = blue
  'Home Run':              'text-blue-600',
  'Triple':                'text-blue-600',
  'Double':                'text-blue-600',
  'Single':                'text-blue-600',
  'Walk':                  'text-blue-600',
  'Hit By Pitch':          'text-blue-600',
  'Intent Walk':           'text-blue-600',
  // Outs = black
  'Strikeout':             'text-gray-900',
  'Strikeout - Swinging':  'text-gray-900',
  'Strikeout - Looking':   'text-gray-900',
  'Groundout':             'text-gray-900',
  'Flyout':                'text-gray-900',
  'Lineout':               'text-gray-900',
  'Pop Out':               'text-gray-900',
  'Forceout':              'text-gray-900',
  'Grounded Into DP':      'text-gray-900',
  'Double Play':           'text-gray-900',
  'Triple Play':           'text-gray-900',
  'Fielders Choice':       'text-gray-900',
  'Sac Fly':               'text-gray-900',
  'Sac Bunt':              'text-gray-900',
  'Sacrifice Fly':         'text-gray-900',
  'Sacrifice Bunt':        'text-gray-900',
  'Field Out':             'text-gray-900',
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
        const halfLabel = play.half === 'top' ? 'Top' : 'Bottom';

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
                    <span className="ml-1 text-[10px] text-accent font-semibold">
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

// ── Prev / Next game navigation ────────────────────────────────────────

function NavChip({
  teamAbbr,
  game,
  dir,
}: {
  teamAbbr: string;
  game: ScheduleNavGame;
  dir: 'prev' | 'next';
}) {
  const router = useRouter();
  // Parse YYYY-MM-DD without timezone shifts
  const [y, m, d] = game.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'MMM d');

  return (
    <button
      onClick={() => router.push(`/game/${game.id}`)}
      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors min-w-0 max-w-[47%]"
    >
      {dir === 'prev' && (
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )}
      <span className="truncate">
        <span className="font-semibold">{teamAbbr}</span>
        {' '}
        <span className="text-gray-400">{dateStr} vs {game.opponent}</span>
      </span>
      {dir === 'next' && (
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

function PrevNextNav({ detail }: { detail: GameDetail }) {
  const hasHomeNav = detail.prevGameHome || detail.nextGameHome;
  const hasAwayNav = detail.prevGameAway || detail.nextGameAway;

  if (!hasHomeNav && !hasAwayNav) return null;

  return (
    <div className="border-t border-surface-200 bg-surface-50 px-4 py-2 flex-shrink-0">
      {hasHomeNav && (
        <div className="flex items-center justify-between py-1">
          {detail.prevGameHome ? (
            <NavChip teamAbbr={detail.homeTeam.abbreviation} game={detail.prevGameHome} dir="prev" />
          ) : (
            <div />
          )}
          {detail.nextGameHome ? (
            <NavChip teamAbbr={detail.homeTeam.abbreviation} game={detail.nextGameHome} dir="next" />
          ) : (
            <div />
          )}
        </div>
      )}
      {hasAwayNav && (
        <div className="flex items-center justify-between py-1">
          {detail.prevGameAway ? (
            <NavChip teamAbbr={detail.awayTeam.abbreviation} game={detail.prevGameAway} dir="prev" />
          ) : (
            <div />
          )}
          {detail.nextGameAway ? (
            <NavChip teamAbbr={detail.awayTeam.abbreviation} game={detail.nextGameAway} dir="next" />
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────

export default function GameDetailView({ id, leagueId }: { id: number; leagueId?: number }) {
  const router = useRouter();
  const { isTeamFav, toggleTeam } = useFavorites();
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('linescore');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const fetchDetail = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const url = leagueId ? `/api/game/${id}?league=${leagueId}` : `/api/game/${id}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data: GameDetail = await res.json();
      setDetail(data);
    } catch {
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  }, [id, leagueId]);

  useEffect(() => { fetchDetail(true); }, [fetchDetail]);

  // Update browser tab title with team names and score
  useEffect(() => {
    if (!detail) return;
    const away = detail.awayTeam.abbreviation;
    const home = detail.homeTeam.abbreviation;
    if (detail.status === 'final' || detail.status === 'live') {
      const extra = detail.status === 'final' && detail.linescore && detail.linescore.length > 9
        ? `/${detail.linescore.length}` : '';
      const statusLabel = detail.status === 'final' ? `Final${extra}` : 'Live';
      document.title = `${away} ${detail.awayScore}, ${home} ${detail.homeScore} · ${statusLabel} | Diamond Score`;
    } else {
      document.title = `${away} @ ${home} | Diamond Score`;
    }
  }, [detail]);

  useEffect(() => {
    if (detail?.status !== 'live' && detail?.status !== 'delayed') return;
    const timer = setInterval(() => fetchDetail(false), 5_000);
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
    <div className="flex flex-col min-h-0">
      <GameHeader detail={detail} onBack={() => router.back()} isTeamFav={isTeamFav} toggleTeam={toggleTeam} />
      <TabBar active={tab} onChange={setTab} showPbp={hasPlays} />

      <div>
        {tab === 'linescore' && <LinescoreTab detail={detail} />}
        {tab === 'boxscore' && <BoxScoreTab detail={detail} />}
        {tab === 'pbp' && <PlayByPlayTab plays={detail.plays ?? []} />}
      </div>

      <PrevNextNav detail={detail} />

      <div className="flex justify-center py-4">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
        >
          Something look wrong?
        </button>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        page={tab}
        gameId={String(id)}
      />
    </div>
  );
}
