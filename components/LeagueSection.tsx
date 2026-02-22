'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types';
import GameCard from './GameCard';

interface LeagueSectionProps {
  name: string;
  abbr?: string;
  logoUrl?: string;
  games: Game[];
  defaultCollapsed?: boolean;
  showTop25Filter?: boolean;
}

export default function LeagueSection({
  name,
  abbr,
  games,
  defaultCollapsed = false,
  showTop25Filter = false,
}: LeagueSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [top25Only, setTop25Only] = useState(false);

  const liveCount = games.filter((g) => g.status === 'live').length;
  const badgeLabel = abbr ?? name.slice(0, 3).toUpperCase();

  const visibleGames =
    showTop25Filter && top25Only
      ? games.filter(
          (g) => (g.homeTeam.rank ?? Infinity) <= 25 || (g.awayTeam.rank ?? Infinity) <= 25,
        )
      : games;

  const rankedCount = showTop25Filter
    ? games.filter(
        (g) => (g.homeTeam.rank ?? Infinity) <= 25 || (g.awayTeam.rank ?? Infinity) <= 25,
      ).length
    : 0;

  return (
    <section className="mb-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left"
      >
        <div className="w-5 h-5 rounded bg-surface-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-gray-600 tracking-tight">
            {badgeLabel}
          </span>
        </div>
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1">
          {name}
        </h2>
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
        <span className="text-xs text-gray-400">{visibleGames.length}</span>
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
          {visibleGames.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">
              No Top 25 games today
            </p>
          ) : (
            visibleGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))
          )}
        </div>
      )}
    </section>
  );
}
