'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import type { Game } from '@/lib/types';
import type { ScoresResult } from '@/lib/buildScores';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import Header from './Header';
import DateStrip from './DateStrip';
import LeagueSection from './LeagueSection';
import FollowingSection from './FollowingSection';

const RETRY_INTERVAL = 30_000;

export default function ScoresView() {
  const [date, setDate] = useState(() => new Date());
  const [data, setData] = useState<ScoresResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { favoriteTeams, isLeagueFav } = useFavorites();
  const { settings } = useSettings();

  const dateStr = format(date, 'yyyy-MM-dd');

  // Reset state on date change
  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
  }, [dateStr]);

  // ── SSE callbacks ────────────────────────────────────────────────

  const handleInit = useCallback((newData: ScoresResult) => {
    setData(newData);
    setLoading(false);
    setError(null);
    setLastSync(new Date());
  }, []);

  const handleUpdate = useCallback((changedGames: Game[], hasLive: boolean) => {
    setData((prev) => {
      if (!prev) return prev;
      const byId = new Map<number, Game>(changedGames.map((g) => [g.id, g]));
      return {
        ...prev,
        hasLive,
        leagues: prev.leagues.map((l) => ({
          ...l,
          games: l.games.map((g) => byId.get(g.id) ?? g),
        })),
      };
    });
    setLastSync(new Date());
  }, []);

  useLiveStream({ date: dateStr, onInit: handleInit, onUpdate: handleUpdate, enabled: true });

  // ── Manual fetch (pull-to-refresh & error retry) ─────────────────

  const fetchScores = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scores?date=${dateStr}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      const json: ScoresResult = await res.json();
      setData(json);
      setLastSync(new Date());
    } catch (err) {
      setError('Failed to load scores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  // Retry on error
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => fetchScores(false), RETRY_INTERVAL);
    return () => clearTimeout(id);
  }, [error, fetchScores]);

  // ── Pull to refresh ─────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startY = 0;
    let canPull = false;
    let didPull = false;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop === 0) {
        startY = e.touches[0].clientY;
        canPull = true;
        didPull = false;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!canPull) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80 && !didPull) {
        didPull = true;
        setPulling(true);
      }
    }

    function onTouchEnd() {
      if (canPull) {
        canPull = false;
        if (didPull) {
          didPull = false;
          setPulling(false);
          fetchScores(true);
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [fetchScores]);

  // ── Render ──────────────────────────────────────────────────────

  // Filter leagues per settings
  const visibleLeagues = data?.leagues.filter(
    (l) => !settings.hiddenLeagues.includes(l.id),
  ) ?? [];

  const totalGames = visibleLeagues.reduce((s, l) => s + l.games.length, 0);

  return (
    <div ref={containerRef} className="flex flex-col min-h-0">
      <Header date={date} onDateChange={setDate} />
      <DateStrip selected={date} onSelect={setDate} />

      {/* Pull indicator */}
      {pulling && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-2 pb-4">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading scores...</p>
          </div>
        )}

        {error && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchScores(true)}
              className="text-xs text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {data && totalGames === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">&#9918;</span>
            <p className="text-sm text-gray-500">No games scheduled</p>
            <p className="text-xs text-gray-600">{format(date, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        )}

        {/* Following section */}
        {data && favoriteTeams.size > 0 && (
          <FollowingSection
            leagues={visibleLeagues}
            favoriteTeams={favoriteTeams}
          />
        )}

        {/* All leagues */}
        {visibleLeagues.map((league) => (
          <LeagueSection
            key={league.id}
            name={league.name}
            logoUrl={league.logoUrl}
            games={league.games}
            defaultCollapsed={isLeagueFav(league.id) ? false : league.defaultCollapsed}
            showTop25Filter={league.showTop25Filter}
          />
        ))}

        {/* Sync indicator */}
        <div className="text-center text-[10px] text-gray-600 py-2">
          {data?.hasLive && !loading ? (
            <span>Live — updating every 15s</span>
          ) : lastSync ? (
            <span>Updated {formatDistanceToNowStrict(lastSync, { addSuffix: true })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
