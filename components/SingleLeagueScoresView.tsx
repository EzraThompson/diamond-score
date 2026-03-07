'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import type { LeagueGroup } from '@/lib/buildScores';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import Header from './Header';
import DateStrip from './DateStrip';
import LeagueSection from './LeagueSection';
import FollowingSection from './FollowingSection';
import ErrorBoundary from './ErrorBoundary';
import { LeagueSkeleton } from './GameCardSkeleton';

interface SlotConfig {
  key: string;
  endpoint: string;
  skeletonName: string;
  skeletonCount: number;
}

interface Props {
  slots: SlotConfig[];
  initialLeagues?: LeagueGroup[];
}

export default function SingleLeagueScoresView({ slots, initialLeagues }: Props) {
  const hasInitial = !!initialLeagues?.length;
  const [date, setDate] = useState(() => new Date());
  const [loading, setLoading] = useState(!hasInitial);
  const [leagues, setLeagues] = useState<LeagueGroup[]>(initialLeagues ?? []);
  const [lastSync, setLastSync] = useState<Date | null>(hasInitial ? new Date() : null);
  const [pulling, setPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { favoriteTeams } = useFavorites();
  const { settings } = useSettings();

  const dateStr = format(date, 'yyyy-MM-dd');

  const fetchAll = useCallback(
    (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setLeagues([]);
      }
      Promise.all(
        slots.map((s) =>
          fetch(`${s.endpoint}?date=${dateStr}`, { cache: 'no-store' })
            .then((r) => {
              if (!r.ok) throw new Error(`${r.status}`);
              return r.json() as Promise<{ leagues: LeagueGroup[] }>;
            })
            .then(({ leagues }) => leagues)
            .catch(() => [] as LeagueGroup[]),
        ),
      ).then((results) => {
        setLeagues(results.flat());
        setLoading(false);
        setLastSync(new Date());
      });
    },
    [dateStr, slots],
  );

  useEffect(() => {
    setLoading(true);
    setLeagues([]);
  }, [dateStr]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchAll(), 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Pull to refresh
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
      if (e.touches[0].clientY - startY > 80 && !didPull) {
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
          fetchAll(true);
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
  }, [fetchAll]);

  const visibleLeagues = leagues.filter((l) => !settings.hiddenLeagues.includes(l.id));
  const hasLive = leagues.some((l) => l.games.some((g) => g.status === 'live'));
  const totalGames = visibleLeagues.reduce((sum, l) => sum + l.games.length, 0);

  return (
    <div ref={containerRef} className="flex flex-col min-h-0">
      <Header date={date} onDateChange={setDate} />
      <DateStrip selected={date} onSelect={setDate} />

      {pulling && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-2 pb-4" style={{ scrollbarGutter: 'stable' }}>
        {!loading && totalGames === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">&#9918;</span>
            <p className="text-sm text-gray-500">No games scheduled</p>
            <p className="text-xs text-gray-600">{format(date, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        )}

        {loading && slots.map((s) => (
          <LeagueSkeleton key={`skeleton-${s.key}`} name={s.skeletonName} count={s.skeletonCount} />
        ))}

        {!loading && favoriteTeams.size > 0 && leagues.length > 0 && (
          <ErrorBoundary label="Following">
            <FollowingSection leagues={leagues} favoriteTeams={favoriteTeams} />
          </ErrorBoundary>
        )}

        {!loading &&
          visibleLeagues.map((league) => (
            <ErrorBoundary key={league.id} label={league.name}>
              <LeagueSection
                name={league.name}
                abbr={league.abbr}
                logoUrl={league.logoUrl}
                games={league.games}
                defaultCollapsed={league.defaultCollapsed}
                showTop25Filter={league.showTop25Filter}
                error={league.error}
                stale={league.stale}
              />
            </ErrorBoundary>
          ))}

        <div className="text-center text-[10px] text-gray-600 py-2">
          {hasLive && !loading ? (
            <span>Live — updating every 30s</span>
          ) : lastSync ? (
            <span>Updated {formatDistanceToNowStrict(lastSync, { addSuffix: true })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
