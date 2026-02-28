'use client';

import { useEffect, useState } from 'react';
import type { Standing, NCAARankingsData, RankedCollegeTeam } from '@/lib/types';
import TeamBadge from '@/components/TeamBadge';
import { findTeam } from '@/lib/teamRegistry';
import { useFavorites } from '@/contexts/FavoritesContext';

// ── Types ──────────────────────────────────────────────────────────────

interface DivisionGroup {
  name: string;
  rows: Standing[];
}

interface StandingsData {
  season: number;
  divisions: DivisionGroup[];
}

type LeagueTab = 'mlb' | 'milb' | 'ncaa' | 'npb' | 'kbo' | 'wbc';

interface MiLBLevel {
  id: number;
  label: string;
  abbr: string;
}

const MILB_LEVELS: MiLBLevel[] = [
  { id: 11, label: 'Triple-A', abbr: 'AAA' },
  { id: 12, label: 'Double-A', abbr: 'AA'  },
  { id: 13, label: 'High-A',   abbr: 'A+'  },
  { id: 14, label: 'Single-A', abbr: 'A'   },
];

const LEAGUE_TABS: { id: LeagueTab; label: string }[] = [
  { id: 'mlb',  label: 'MLB'  },
  { id: 'milb', label: 'MiLB' },
  { id: 'ncaa', label: 'NCAA' },
  { id: 'npb',  label: 'NPB'  },
  { id: 'kbo',  label: 'KBO'  },
  { id: 'wbc',  label: 'WBC'  },
];

// ── WBC types ───────────────────────────────────────────────────────────

interface WBCPoolGroup {
  name: string;
  rows: Standing[];
}

interface WBCStandingsData {
  pools: WBCPoolGroup[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function shortDivName(name: string): string {
  return name
    .replace('American League', 'AL')
    .replace('National League', 'NL');
}

function pctStr(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

// ── Sub-components ─────────────────────────────────────────────────────

function StandingsBadge({ team }: { team: Standing['team'] }) {
  const color = team.primaryColor ?? findTeam(team.abbreviation)?.primaryColor;
  return <TeamBadge abbreviation={team.abbreviation} primaryColor={color} />;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-colors ${filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-transparent'}`}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DivisionTable({
  division,
  playoffSpots = 1,
}: {
  division: DivisionGroup;
  playoffSpots?: number;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pb-1.5">
        {shortDivName(division.name)}
      </h3>
      <div className="bg-surface-50 rounded-xl overflow-hidden mx-4 border border-surface-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-400 uppercase border-b border-surface-200 bg-surface-100">
              <th className="text-left py-2 px-3 font-semibold w-6">#</th>
              <th className="text-left py-2 px-1 font-semibold">Team</th>
              <th className="text-center py-2 px-2 font-semibold">W</th>
              <th className="text-center py-2 px-2 font-semibold">L</th>
              <th className="text-center py-2 px-2 font-semibold">PCT</th>
              <th className="text-center py-2 px-2 font-semibold">GB</th>
              <th className="text-center py-2 px-2 font-semibold hidden sm:table-cell">L10</th>
              <th className="text-center py-2 px-2 font-semibold hidden sm:table-cell">STK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {division.rows.map((row, i) => {
              const inPlayoffs = i < playoffSpots;
              return (
                <tr
                  key={row.team.id}
                  className={`transition-colors ${
                    inPlayoffs ? 'bg-accent/5' : 'hover:bg-surface-100'
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        inPlayoffs ? 'text-accent' : 'text-gray-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <StandingsBadge team={row.team} />
                      <span
                        className={`text-xs font-semibold ${
                          inPlayoffs ? 'text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {row.team.abbreviation}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs font-semibold text-gray-700">
                    {row.wins}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs text-gray-500">
                    {row.losses}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs text-gray-500">
                    {pctStr(row.pct)}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs text-gray-500">
                    {row.gamesBack === 0 ? '—' : row.gamesBack}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs text-gray-500 hidden sm:table-cell">
                    {row.last10}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-xs hidden sm:table-cell">
                    <span
                      className={
                        row.streak.startsWith('W')
                          ? 'text-accent font-semibold'
                          : row.streak.startsWith('L')
                          ? 'text-red-400 font-semibold'
                          : 'text-gray-500'
                      }
                    >
                      {row.streak}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── NCAA Top 25 ────────────────────────────────────────────────────────

function NCAATeamRow({
  team,
  isFav,
  onToggle,
}: {
  team: RankedCollegeTeam;
  isFav: boolean;
  onToggle: () => void;
}) {
  const isTop5 = team.rank <= 5;
  return (
    <tr className={`transition-colors ${isTop5 ? 'bg-accent/5' : 'hover:bg-surface-100'}`}>
      <td className="py-2.5 px-3">
        <span
          className={`text-[10px] font-bold tabular-nums ${
            isTop5 ? 'text-accent' : 'text-gray-300'
          }`}
        >
          {team.rank}
        </span>
      </td>
      <td className="py-2.5 px-1">
        <div className="flex items-center gap-2">
          <TeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} />
          <div className="min-w-0">
            <span
              className={`text-xs font-semibold block ${
                isTop5 ? 'text-gray-900' : 'text-gray-600'
              }`}
            >
              {team.abbreviation}
            </span>
            {team.conference && (
              <span className="text-[10px] text-gray-400 sm:hidden">{team.conference}</span>
            )}
          </div>
        </div>
      </td>
      <td className="py-2.5 px-2 text-xs text-gray-400 hidden sm:table-cell">
        {team.conference ?? '—'}
      </td>
      <td className="py-2.5 px-2 text-center tabular-nums text-xs font-semibold text-gray-700">
        {team.wins}
      </td>
      <td className="py-2.5 px-2 text-center tabular-nums text-xs text-gray-500">
        {team.losses}
      </td>
      <td className="py-2 px-2 text-center">
        <button onClick={onToggle} className="p-1 -m-1">
          <StarIcon filled={isFav} />
        </button>
      </td>
    </tr>
  );
}

function NCAATab({
  favoriteTeams,
  toggleTeam,
}: {
  favoriteTeams: Set<string>;
  toggleTeam: (abbr: string) => void;
}) {
  const [data, setData] = useState<NCAARankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rankings/ncaa')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<NCAARankingsData>;
      })
      .then(setData)
      .catch(() => setError('Failed to load rankings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data?.teams.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm text-gray-500">Rankings not available</p>
        <p className="text-xs text-gray-400">Season may not have started yet</p>
      </div>
    );
  }

  return (
    <div className="pt-3 pb-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {data.pollName}
        </p>
        <p className="text-[10px] text-gray-400">⭐ = follow team</p>
      </div>
      <div className="bg-surface-50 rounded-xl overflow-hidden mx-4 border border-surface-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-400 uppercase border-b border-surface-200 bg-surface-100">
              <th className="text-left py-2 px-3 font-semibold w-6">#</th>
              <th className="text-left py-2 px-1 font-semibold">Team</th>
              <th className="text-left py-2 px-2 font-semibold hidden sm:table-cell">Conf</th>
              <th className="text-center py-2 px-2 font-semibold">W</th>
              <th className="text-center py-2 px-2 font-semibold">L</th>
              <th className="py-2 px-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {data.teams.map((team) => (
              <NCAATeamRow
                key={team.id}
                team={team}
                isFav={favoriteTeams.has(team.abbreviation)}
                onToggle={() => toggleTeam(team.abbreviation)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── WBC ────────────────────────────────────────────────────────────────

function WBCTab() {
  const [data, setData] = useState<WBCStandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/standings/wbc')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<WBCStandingsData>;
      })
      .then(setData)
      .catch(() => setError('Failed to load standings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data?.pools.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm text-gray-500">WBC standings not available</p>
        <p className="text-xs text-gray-400">Tournament may not be active</p>
      </div>
    );
  }

  return (
    <div className="pt-3 pb-4">
      {data.pools.map((pool) => (
        <DivisionTable key={pool.name} division={pool} playoffSpots={2} />
      ))}
    </div>
  );
}

// ── Shared states ──────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}

function ComingSoon({ league }: { league: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mb-1">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-600">{league} Standings</p>
      <p className="text-xs text-gray-400">Coming soon</p>
    </div>
  );
}

// ── View ───────────────────────────────────────────────────────────────

export default function StandingsView() {
  const { favoriteTeams, toggleTeam } = useFavorites();

  const [leagueTab, setLeagueTab]   = useState<LeagueTab>('mlb');
  const [milbLevel, setMilbLevel]   = useState<MiLBLevel>(MILB_LEVELS[0]);
  const [data, setData]             = useState<StandingsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (leagueTab === 'npb' || leagueTab === 'kbo' || leagueTab === 'ncaa' || leagueTab === 'wbc') {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    const url =
      leagueTab === 'mlb'
        ? '/api/standings'
        : `/api/standings/milb?level=${milbLevel.id}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<StandingsData>;
      })
      .then(setData)
      .catch(() => setError('Failed to load standings'))
      .finally(() => setLoading(false));
  }, [leagueTab, milbLevel]);

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-surface-200">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-base font-bold text-gray-900">Standings</h1>
          {data && (
            <span className="text-xs text-gray-400">{data.season} Season</span>
          )}
        </div>

        {/* League tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
          {LEAGUE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeagueTab(tab.id)}
              className={`flex-shrink-0 flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors ${
                leagueTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MiLB level sub-tabs */}
        {leagueTab === 'milb' && (
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
            {MILB_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setMilbLevel(level)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                  milbLevel.id === level.id
                    ? 'bg-gray-700 text-white'
                    : 'bg-surface-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                {level.abbr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* NCAA: Top 25 rankings */}
        {leagueTab === 'ncaa' && (
          <NCAATab favoriteTeams={favoriteTeams} toggleTeam={toggleTeam} />
        )}

        {/* WBC: pool standings */}
        {leagueTab === 'wbc' && <WBCTab />}

        {/* NPB / KBO: not yet available */}
        {(leagueTab === 'npb' || leagueTab === 'kbo') && (
          <ComingSoon league={leagueTab.toUpperCase()} />
        )}

        {/* MLB / MiLB */}
        {leagueTab !== 'npb' && leagueTab !== 'kbo' && leagueTab !== 'ncaa' && leagueTab !== 'wbc' && (
          <>
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {!loading && !error && data?.divisions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-sm text-gray-500">No standings available yet</p>
                <p className="text-xs text-gray-400">Season may not have started</p>
              </div>
            )}
            {data?.divisions.map((div) => (
              <DivisionTable key={div.name} division={div} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
