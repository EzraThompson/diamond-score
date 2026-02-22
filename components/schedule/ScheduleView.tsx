'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import type { ScoresResult, LeagueGroup } from '@/lib/buildScores';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import MonthCalendar from './MonthCalendar';
import LeagueSection from '@/components/LeagueSection';

const LEAGUE_CHIPS: { id: number; label: string }[] = [
  { id: 0, label: 'All' },
  { id: 1, label: 'MLB' },
  { id: 2, label: 'NPB' },
  { id: 3, label: 'KBO' },
];

export default function ScheduleView() {
  const [calMonth, setCalMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [gameDays, setGameDays] = useState<Set<string>>(new Set());
  const [data, setData] = useState<ScoresResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState<number>(0);
  const [favesOnly, setFavesOnly] = useState(false);

  const { favoriteTeams } = useFavorites();
  const { settings } = useSettings();

  // Fetch game days whenever the calendar month changes
  useEffect(() => {
    const monthStr = format(calMonth, 'yyyy-MM');
    fetch(`/api/schedule/game-days?month=${monthStr}`)
      .then((r) => r.json())
      .then(({ dates }: { dates: string[] }) => setGameDays(new Set(dates)))
      .catch(() => setGameDays(new Set()));
  }, [calMonth]);

  // Fetch scores whenever the selected date changes
  useEffect(() => {
    setLoading(true);
    setData(null);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    fetch(`/api/scores?date=${dateStr}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: ScoresResult) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  function handleSelectDate(d: Date) {
    setSelectedDate(d);
    // Auto-navigate calendar if the user taps an adjacent-month day
    if (!isSameMonth(d, calMonth)) {
      setCalMonth(startOfMonth(d));
    }
  }

  function handleTodayClick() {
    const now = new Date();
    setCalMonth(startOfMonth(now));
    setSelectedDate(now);
  }

  // Build filtered league list
  let filteredLeagues: LeagueGroup[] = data?.leagues.filter(
    (l) => !settings.hiddenLeagues.includes(l.id),
  ) ?? [];

  if (leagueFilter !== 0) {
    filteredLeagues = filteredLeagues.filter((l) => l.id === leagueFilter);
  }

  if (favesOnly && favoriteTeams.size > 0) {
    filteredLeagues = filteredLeagues
      .map((l) => ({
        ...l,
        games: l.games.filter(
          (g) =>
            favoriteTeams.has(g.homeTeam.abbreviation) ||
            favoriteTeams.has(g.awayTeam.abbreviation),
        ),
      }))
      .filter((l) => l.games.length > 0);
  }

  const totalGames = filteredLeagues.reduce((s, l) => s + l.games.length, 0);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900">Schedule</h1>
        <button
          onClick={handleTodayClick}
          className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity"
        >
          Today
        </button>
      </div>

      {/* Calendar */}
      <div className="flex-shrink-0">
        <MonthCalendar
          month={calMonth}
          selectedDate={selectedDate}
          gameDays={gameDays}
          onSelectDate={handleSelectDate}
          onMonthChange={setCalMonth}
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar flex-shrink-0 border-b border-surface-200">
        {LEAGUE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setLeagueFilter(chip.id)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              leagueFilter === chip.id
                ? 'bg-accent text-white'
                : 'bg-surface-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {chip.label}
          </button>
        ))}

        {/* Following toggle */}
        <button
          onClick={() => setFavesOnly((v) => !v)}
          className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            favesOnly
              ? 'bg-amber-400/20 text-amber-500'
              : 'bg-surface-200 text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill={favesOnly ? '#F59E0B' : 'none'}
            stroke={favesOnly ? '#F59E0B' : 'currentColor'}
            strokeWidth="1.5"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Following
        </button>
      </div>

      {/* Selected date label */}
      <div className="px-4 pt-2 pb-1 flex-shrink-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          {format(selectedDate, 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && totalGames === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl">⚾</span>
            <p className="text-sm text-gray-500">No games scheduled</p>
            <p className="text-xs text-gray-400">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        )}

        {!loading &&
          filteredLeagues.map((league) => (
            <LeagueSection
              key={league.id}
              name={league.name}
              games={league.games}
              defaultCollapsed={false}
              showTop25Filter={league.showTop25Filter}
            />
          ))}
      </div>
    </div>
  );
}
