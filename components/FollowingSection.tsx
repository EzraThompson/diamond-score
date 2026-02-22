'use client';

import type { Game } from '@/lib/types';
import type { LeagueGroup } from '@/lib/buildScores';
import GameCard from './GameCard';

interface FollowingSectionProps {
  leagues: LeagueGroup[];
  favoriteTeams: Set<string>;
}

export default function FollowingSection({ leagues, favoriteTeams }: FollowingSectionProps) {
  if (favoriteTeams.size === 0) return null;

  // Collect all games where a followed team is playing (dedupe by game id)
  const seen = new Set<number>();
  const games: Game[] = [];
  for (const league of leagues) {
    for (const g of league.games) {
      if (seen.has(g.id)) continue;
      if (
        favoriteTeams.has(g.homeTeam.abbreviation) ||
        favoriteTeams.has(g.awayTeam.abbreviation)
      ) {
        seen.add(g.id);
        games.push(g);
      }
    }
  }

  if (games.length === 0) return null;

  // Sort: live first, then by scheduled time
  const sorted = [...games].sort((a, b) => {
    const order = { live: 0, final: 1, scheduled: 2, postponed: 3, delayed: 3 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  });

  return (
    <section className="mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <svg
          className="w-3.5 h-3.5 text-amber-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="#F59E0B"
          stroke="#F59E0B"
          strokeWidth="1"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1">
          Following
        </h2>
        <span className="text-xs text-gray-400">{sorted.length}</span>
      </div>

      {/* Games */}
      <div className="flex flex-col gap-2 px-4">
        {sorted.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 mt-4 border-t border-surface-200" />
    </section>
  );
}
