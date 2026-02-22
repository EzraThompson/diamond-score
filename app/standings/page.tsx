'use client';

import { useEffect, useState } from 'react';
import type { Standing } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────

interface DivisionGroup {
  name: string;
  rows: Standing[];
}

interface StandingsData {
  season: number;
  divisions: DivisionGroup[];
}

type Level = { id: 'mlb' | number; label: string; abbr: string };

const LEVELS: Level[] = [
  { id: 'mlb', label: 'MLB',     abbr: 'MLB' },
  { id: 11,    label: 'Triple-A', abbr: 'AAA' },
  { id: 12,    label: 'Double-A', abbr: 'AA'  },
  { id: 13,    label: 'High-A',   abbr: 'A+' },
  { id: 14,    label: 'Single-A', abbr: 'A'   },
];

// ── Helpers ───────────────────────────────────────────────────────────

function shortDivName(name: string | undefined): string {
  if (!name) return '';
  return name
    .replace('American League', 'AL')
    .replace('National League', 'NL');
}

function apiUrl(levelId: Level['id']): string {
  return levelId === 'mlb' ? '/api/standings' : `/api/standings/milb?level=${levelId}`;
}

// ── Components ────────────────────────────────────────────────────────

function DivisionTable({ division }: { division: DivisionGroup }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 pb-1.5">
        {shortDivName(division.name)}
      </h3>
      <div className="bg-surface-50 rounded-xl overflow-hidden mx-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-600 uppercase border-b border-surface-200">
              <th className="text-left py-2 px-3 font-medium">Team</th>
              <th className="text-center py-2 px-2 font-medium">W</th>
              <th className="text-center py-2 px-2 font-medium">L</th>
              <th className="text-center py-2 px-2 font-medium">PCT</th>
              <th className="text-center py-2 px-2 font-medium">GB</th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">L10</th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">STK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {division.rows.map((row, i) => (
              <tr key={row.team.id} className="transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {row.team.logoUrl && (
                      <img
                        src={row.team.logoUrl}
                        alt=""
                        className="w-5 h-5 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span className={`text-sm font-semibold ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                      {row.team.abbreviation}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center tabular-nums text-gray-400">{row.wins}</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-gray-400">{row.losses}</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-gray-500">
                  {row.pct.toFixed(3).replace(/^0/, '')}
                </td>
                <td className="py-2.5 px-2 text-center tabular-nums text-gray-500">
                  {row.gamesBack === 0 ? '—' : row.gamesBack}
                </td>
                <td className="py-2.5 px-2 text-center tabular-nums text-gray-500 hidden sm:table-cell">
                  {row.last10}
                </td>
                <td className="py-2.5 px-2 text-center tabular-nums hidden sm:table-cell">
                  <span className={
                    row.streak.startsWith('W') ? 'text-live'
                    : row.streak.startsWith('L') ? 'text-red-400'
                    : 'text-gray-500'
                  }>
                    {row.streak}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function StandingsPage() {
  const [activeLevel, setActiveLevel] = useState<Level>(LEVELS[0]);
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);

    fetch(apiUrl(activeLevel.id))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<StandingsData>;
      })
      .then(setData)
      .catch(() => setError('Failed to load standings'))
      .finally(() => setLoading(false));
  }, [activeLevel]);

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-surface-200">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-base font-bold text-white">Standings</h1>
          {data && (
            <span className="text-xs text-gray-500">{data.season} Season</span>
          )}
        </div>

        {/* Level selector */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setActiveLevel(level)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                activeLevel.id === level.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-100 text-gray-400 hover:text-white'
              }`}
            >
              {level.abbr}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-3 pb-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading standings…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && data?.divisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-sm text-gray-500">No standings available</p>
            <p className="text-xs text-gray-600">{activeLevel.label} season may not have started yet</p>
          </div>
        )}

        {data?.divisions.map((div) => (
          <DivisionTable key={div.name} division={div} />
        ))}
      </div>
    </div>
  );
}
