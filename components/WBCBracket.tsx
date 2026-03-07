'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { BracketGame, WBCBracketData } from '@/app/api/wbc/bracket/route';

// ── Helpers ───────────────────────────────────────────────────────────

function formatGameTime(iso: string): string {
  if (!iso) return 'TBD';
  try {
    const d = new Date(iso);
    return format(d, 'MMM d · h:mm a');
  } catch {
    return 'TBD';
  }
}

// ── BracketCard ───────────────────────────────────────────────────────

function TeamRow({
  team,
  placeholder,
  isWinner,
}: {
  team: BracketGame['homeTeam'];
  placeholder: string;
  isWinner: boolean;
}) {
  const color = team?.primaryColor ?? '#6b7280';
  const abbr = team?.abbreviation ?? null;
  const score = team?.score;
  const isTBD = !abbr;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${isWinner ? 'font-bold' : ''}`}
    >
      {/* Color swatch / abbr badge */}
      <div
        className="w-7 h-6 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isTBD ? '#e5e7eb' : color }}
      >
        <span
          className="text-[8px] font-bold tracking-tighter whitespace-nowrap"
          style={{ color: isTBD ? '#9ca3af' : 'white' }}
        >
          {isTBD ? '???' : abbr}
        </span>
      </div>

      {/* Team name or placeholder */}
      <span
        className={`flex-1 text-xs leading-tight ${
          isTBD ? 'text-gray-400 italic' : isWinner ? 'text-gray-900' : 'text-gray-600'
        }`}
      >
        {isTBD ? placeholder : team!.name}
      </span>

      {/* Score */}
      {score !== undefined && !isTBD && (
        <span
          className={`text-sm tabular-nums ${isWinner ? 'text-gray-900 font-bold' : 'text-gray-400'}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function BracketCard({ game, index }: { game: BracketGame; index: number }) {
  const isFinal = game.status === 'final';
  const isLive = game.status === 'live';
  const hasTeams = game.homeTeam || game.awayTeam;

  const homeWins = isFinal && hasTeams
    ? (game.homeTeam?.score ?? 0) > (game.awayTeam?.score ?? 0)
    : false;
  const awayWins = isFinal && hasTeams
    ? (game.awayTeam?.score ?? 0) > (game.homeTeam?.score ?? 0)
    : false;

  const gameLabel =
    game.round === 'Quarterfinal'
      ? `Game ${index + 1}`
      : game.round === 'Semifinal'
      ? `Game ${index + 1}`
      : null;

  return (
    <div
      className={`bg-surface-50 rounded-xl border overflow-hidden ${
        isLive
          ? 'border-live/40 shadow-sm shadow-live/10'
          : isFinal
          ? 'border-surface-200'
          : 'border-surface-200 border-dashed opacity-80'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {gameLabel}
        </span>
        <span
          className={`text-[10px] font-semibold ${
            isLive ? 'text-live' : isFinal ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {isLive ? '● Live' : isFinal ? 'Final' : formatGameTime(game.scheduledTime)}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-surface-200 mx-3" />

      {/* Away team */}
      <TeamRow
        team={game.awayTeam}
        placeholder={game.awayPlaceholder}
        isWinner={awayWins}
      />

      {/* Divider */}
      <div className="h-px bg-surface-200 mx-3" />

      {/* Home team */}
      <TeamRow
        team={game.homeTeam}
        placeholder={game.homePlaceholder}
        isWinner={homeWins}
      />
    </div>
  );
}

// ── Round section ─────────────────────────────────────────────────────

function RoundSection({
  label,
  games,
}: {
  label: string;
  games: BracketGame[];
}) {
  if (games.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
        {label}
      </p>
      <div className="flex flex-col gap-2 px-4">
        {games.map((g, i) => (
          <BracketCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── WBCBracket ────────────────────────────────────────────────────────

export default function WBCBracket() {
  const [data, setData] = useState<WBCBracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wbc/bracket', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<WBCBracketData>;
      })
      .then(setData)
      .catch(() => setError('Could not load bracket'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading bracket…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const totalBracketGames =
    (data?.quarterfinals.length ?? 0) +
    (data?.semifinals.length ?? 0) +
    (data?.championship.length ?? 0);

  if (totalBracketGames === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mb-1">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-600">Bracket not yet available</p>
        <p className="text-xs text-gray-400">Check back once pool play is underway</p>
      </div>
    );
  }

  // Note: if all bracket games are placeholder-only (id < 0), show a "coming soon" note
  const allPlaceholder =
    (data?.quarterfinals.every((g) => g.id < 0) ?? true) &&
    (data?.semifinals.every((g) => g.id < 0) ?? true) &&
    (data?.championship.every((g) => g.id < 0) ?? true);

  return (
    <div className="pt-3 pb-6">
      {allPlaceholder && (
        <div className="mx-4 mb-3 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2">
          <p className="text-[11px] text-accent font-medium">
            Bracket games will be confirmed after pool play concludes
          </p>
        </div>
      )}
      {data && <RoundSection label="Quarterfinals" games={data.quarterfinals} />}
      {data && <RoundSection label="Semifinals" games={data.semifinals} />}
      {data && <RoundSection label="Championship" games={data.championship} />}
    </div>
  );
}
