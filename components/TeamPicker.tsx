'use client';

import { useState } from 'react';
import { ALL_TEAMS } from '@/lib/teamRegistry';
import TeamBadge from './TeamBadge';

interface TeamPickerProps {
  selectedTeams: Set<string>;
  onToggle: (abbr: string) => void;
}

const LEAGUE_TABS = [
  { id: 0,  label: 'All' },
  { id: 1,  label: 'MLB' },
  { id: 2,  label: 'NPB' },
  { id: 3,  label: 'KBO' },
  { id: 20, label: 'WBC' },
];

export default function TeamPicker({ selectedTeams, onToggle }: TeamPickerProps) {
  const [query, setQuery] = useState('');
  const [activeLeague, setActiveLeague] = useState(0);

  const filtered = ALL_TEAMS.filter((t) => {
    const matchesLeague = activeLeague === 0 || t.leagueId === activeLeague;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.abbreviation.toLowerCase().includes(q);
    return matchesLeague && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search teams..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-surface-100 border border-surface-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-accent"
        />
      </div>

      {/* League tabs */}
      <div className="flex gap-1">
        {LEAGUE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLeague(tab.id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeLeague === tab.id
                ? 'bg-accent text-white'
                : 'bg-surface-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
        {filtered.map((team) => {
          const isFav = selectedTeams.has(team.abbreviation);
          return (
            <button
              key={`${team.leagueId}-${team.abbreviation}`}
              onClick={() => onToggle(team.abbreviation)}
              title={team.name}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                isFav
                  ? 'bg-accent/10 ring-1 ring-accent'
                  : 'hover:bg-surface-100'
              }`}
            >
              <TeamBadge
                abbreviation={team.abbreviation}
                primaryColor={team.primaryColor}
              />
              <span className="text-[8px] font-semibold text-gray-500 truncate w-full text-center leading-tight">
                {team.abbreviation}
              </span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-5 py-6 text-center text-xs text-gray-400">
            No teams found
          </div>
        )}
      </div>

      {/* Selection count */}
      {selectedTeams.size > 0 && (
        <p className="text-[10px] text-center text-accent font-semibold">
          {selectedTeams.size} team{selectedTeams.size !== 1 ? 's' : ''} followed
        </p>
      )}
    </div>
  );
}
