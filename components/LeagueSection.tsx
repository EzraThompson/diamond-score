'use client';

import { useState } from 'react';
import GameCard from './GameCard';
import ErrorBoundary from './ErrorBoundary';
import type { Game } from '@/lib/types';

interface LeagueSectionProps {
  name: string;
  abbr?: string;
  logoUrl?: string;
  games: Game[];
  defaultCollapsed?: boolean;
  showTop25Filter?: boolean;
  /** Set when the data source for this league had an error. */
  error?: string;
  /** True when games data is from a stale cache (not a fresh fetch). */
  stale?: boolean;
}

export default function LeagueSection({
  name,
  abbr,
  games,
  defaultCollapsed = false,
  showTop25Filter = false,
  error,
  stale,
}: LeagueSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [top25Only, setTop25Only] = useState(false);

  const liveCount = games.filter((g) => g.status === 'live').length;
  const badgeLabel = abbr ?? name.slice(0, 3).toUpperCase();

  const STATUS_ORDER: Record<string, number> = { live: 0, delayed: 0, scheduled: 1, final: 2, postponed: 3 };
  const filteredGames =
    showTop25Filter && top25Only
      ? games.filter(
          (g) => (g.homeTeam.rank ?? Infinity) <= 25 || (g.awayTeam.rank ?? Infinity) <= 25,
        )
      : games;
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const visibleGames = [...filteredGames].sort((a, b) => {
    const diff = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
    if (diff !== 0) return diff;
    // For scheduled games whose timestamp is >3h in the past, bump by 24h so
    // they sort after genuinely upcoming games (handles next-day early-AM starts
    // whose UTC timestamp falls on the current calendar date).
    let tA = new Date(a.scheduledTime).getTime();
    let tB = new Date(b.scheduledTime).getTime();
    if (a.status === 'scheduled' && now - tA > 3 * 3_600_000) tA += DAY_MS;
    if (b.status === 'scheduled' && now - tB > 3 * 3_600_000) tB += DAY_MS;
    return tA - tB;
  });

  const rankedCount = showTop25Filter
    ? games.filter(
        (g) => (g.homeTeam.rank ?? Infinity) <= 25 || (g.awayTeam.rank ?? Infinity) <= 25,
      ).length
    : 0;

  const isUnavailable = !!error && games.length === 0;

  return (
    <section className="mb-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left"
      >
        <div className="w-7 h-5 rounded bg-surface-200 flex items-center justify-center flex-shrink-0 px-0.5">
          <span className="text-[8px] font-bold text-gray-600 tracking-tighter whitespace-nowrap">
            {badgeLabel}
          </span>
        </div>
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1">
          {name}
        </h2>
        {stale && !error && (
          <span className="text-[9px] text-yellow-500 font-medium">cached</span>
        )}
        {liveCount > 0 && (
          <span className="text-[10px] font-semibold text-live bg-live/10 px-1.5 py-0.5 rounded">
            {liveCount} live
          </span>
        )}
        {showTop25Filter && rankedCount > 0 && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setTop25Only((v) => !v);
              if (!top25Only) setCollapsed(false);
            }}
            className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              top25Only
                ? 'bg-accent text-white'
                : 'bg-surface-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Top 25</span>
            {top25Only && (
              <span className="text-[8px] opacity-75">({visibleGames.length})</span>
            )}
          </span>
        )}
        {!isUnavailable && (
          <span className="text-xs text-gray-400">{visibleGames.length}</span>
        )}
        {isUnavailable && (
          <span className="text-[9px] text-red-400 font-medium">unavailable</span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 px-4">
          {/* Data source error with stale fallback message */}
          {error && games.length > 0 && (
            <p className="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5">
              {error} — showing last known scores
            </p>
          )}

          {/* Total failure: no games and error */}
          {isUnavailable && (
            <div className="flex flex-col items-center py-4 gap-1.5">
              <span className="text-lg">&#128268;</span>
              <p className="text-xs font-medium text-gray-500">{error}</p>
              <p className="text-[10px] text-gray-400">Check back soon</p>
            </div>
          )}

          {/* Top-25 filter produced no results */}
          {!isUnavailable && visibleGames.length === 0 && games.length > 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">
              No Top 25 games today
            </p>
          )}

          {/* No games, no error */}
          {!isUnavailable && games.length === 0 && !error && (
            <p className="text-xs text-gray-400 py-2 text-center">
              No games today
            </p>
          )}

          {/* Game cards wrapped in error boundaries */}
          {visibleGames.map((game) => (
            <ErrorBoundary key={game.id} label={`${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`}>
              <GameCard game={game} />
            </ErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}
