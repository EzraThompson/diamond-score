'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import type { Game } from '@/lib/types';
import type { LeagueGroup, ScoresResult } from '@/lib/buildScores';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from './Toast';
import Header from './Header';
import DateStrip from './DateStrip';
import LeagueSection from './LeagueSection';
import FollowingSection from './FollowingSection';
import ErrorBoundary from './ErrorBoundary';
import { LeagueSkeleton } from './GameCardSkeleton';

// ── Slot configuration (display order) ──────────────────────────────────────

const SCORE_SLOTS = [
  { key: 'wbc',  endpoint: '/api/scores/wbc',  skeletonName: 'WBC',              skeletonCount: 2 },
  { key: 'mlb',  endpoint: '/api/scores/mlb',  skeletonName: 'MLB',              skeletonCount: 3 },
  { key: 'milb', endpoint: '/api/scores/milb', skeletonName: 'MiLB',             skeletonCount: 2 },
  { key: 'npb',  endpoint: '/api/scores/npb',  skeletonName: 'NPB',              skeletonCount: 2 },
  { key: 'kbo',  endpoint: '/api/scores/kbo',  skeletonName: 'KBO',              skeletonCount: 2 },
  { key: 'ncaa', endpoint: '/api/scores/ncaa', skeletonName: 'College Baseball',  skeletonCount: 2 },
] as const;

type SlotKey = (typeof SCORE_SLOTS)[number]['key'];

// Map league IDs → slot key so SSE init data can be distributed
const LEAGUE_ID_TO_SLOT: Record<number, SlotKey> = {
  20: 'wbc',
  1:  'mlb',
  11: 'milb', 12: 'milb', 13: 'milb', 14: 'milb',
  2:  'npb',
  3:  'kbo',
  16: 'ncaa',
};

interface SlotData {
  loading: boolean;
  leagues: LeagueGroup[];
  error: boolean;
}

type SlotsState = Record<SlotKey, SlotData>;

const makeInitialSlots = (): SlotsState =>
  Object.fromEntries(
    SCORE_SLOTS.map((s) => [s.key, { loading: true, leagues: [], error: false }]),
  ) as unknown as SlotsState;

// ── Component ────────────────────────────────────────────────────────────────

export default function ScoresView() {
  const [date, setDate] = useState(() => new Date());
  const [slots, setSlots] = useState<SlotsState>(makeInitialSlots);
  const [pulling, setPulling] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasShownConnectionError = useRef(false);

  const { favoriteTeams } = useFavorites();
  const { settings } = useSettings();
  const { toast } = useToast();

  const dateStr = format(date, 'yyyy-MM-dd');

  // ── Per-slot fetch ────────────────────────────────────────────────────────

  const fetchSlot = useCallback(
    (slotKey: SlotKey, endpoint: string) => {
      fetch(`${endpoint}?date=${dateStr}`, { cache: 'no-store' })
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.json() as Promise<{ leagues: LeagueGroup[] }>;
        })
        .then(({ leagues }) => {
          setSlots((prev) => ({ ...prev, [slotKey]: { loading: false, leagues, error: false } }));
          setLastSync(new Date());
          hasShownConnectionError.current = false;
        })
        .catch(() => {
          setSlots((prev) => ({ ...prev, [slotKey]: { loading: false, leagues: [], error: true } }));
          if (!hasShownConnectionError.current) {
            hasShownConnectionError.current = true;
            toast('Connection issue — some data may be missing', 'warn');
          }
        });
    },
    [dateStr, toast],
  );

  // Fire all per-league fetches in parallel whenever the date changes
  const fetchAllSlots = useCallback(
    (showLoading = false) => {
      if (showLoading) setSlots(makeInitialSlots());
      for (const slot of SCORE_SLOTS) {
        fetchSlot(slot.key, slot.endpoint);
      }
    },
    [fetchSlot],
  );

  // Reset + refetch on date change
  useEffect(() => {
    setSlots(makeInitialSlots());
    hasShownConnectionError.current = false;
  }, [dateStr]);

  useEffect(() => {
    fetchAllSlots();
  }, [fetchAllSlots]);

  // ── SSE callbacks ─────────────────────────────────────────────────────────

  // SSE init: distribute full ScoresResult into slots (used on reconnect)
  const handleInit = useCallback((newData: ScoresResult) => {
    const slotLeagues: Record<SlotKey, LeagueGroup[]> = {
      wbc: [], mlb: [], milb: [], npb: [], kbo: [], ncaa: [],
    };
    for (const league of newData.leagues) {
      const slotKey = LEAGUE_ID_TO_SLOT[league.id];
      if (slotKey) slotLeagues[slotKey].push(league);
    }
    setSlots(
      Object.fromEntries(
        SCORE_SLOTS.map((s) => [s.key, { loading: false, leagues: slotLeagues[s.key], error: false }]),
      ) as SlotsState,
    );
    setLastSync(new Date());
  }, []);

  // SSE update: patch changed games across all slots by game ID
  const handleUpdate = useCallback((changedGames: Game[]) => {
    const byId = new Map(changedGames.map((g) => [g.id, g]));
    setSlots((prev) => {
      const next = { ...prev };
      for (const slotKey of Object.keys(next) as SlotKey[]) {
        const slot = next[slotKey];
        const updatedLeagues = slot.leagues.map((l) => ({
          ...l,
          games: l.games.map((g) => byId.get(g.id) ?? g),
        }));
        if (updatedLeagues.some((l, i) => l !== slot.leagues[i])) {
          next[slotKey] = { ...slot, leagues: updatedLeagues };
        }
      }
      return next;
    });
    setLastSync(new Date());
  }, []);

  useLiveStream({ date: dateStr, onInit: handleInit, onUpdate: handleUpdate, enabled: true });

  // ── Pull to refresh ───────────────────────────────────────────────────────

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
          fetchAllSlots(true);
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
  }, [fetchAllSlots]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const allLeagues = SCORE_SLOTS.flatMap((s) => slots[s.key].leagues);
  const visibleLeagues = allLeagues.filter((l) => !settings.hiddenLeagues.includes(l.id));
  const hasLive = allLeagues.some((l) => l.games.some((g) => g.status === 'live'));
  const allLoaded = SCORE_SLOTS.every((s) => !slots[s.key].loading);
  const totalGames = visibleLeagues.reduce((sum, l) => sum + l.games.length, 0);
  const anyLoaded = SCORE_SLOTS.some((s) => !slots[s.key].loading);

  // ── Render ────────────────────────────────────────────────────────────────

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
        {/* No games today (all loaded, nothing scheduled) */}
        {allLoaded && totalGames === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">&#9918;</span>
            <p className="text-sm text-gray-500">No games scheduled</p>
            <p className="text-xs text-gray-600">{format(date, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        )}

        {/* Following section — show once any slot has data */}
        {anyLoaded && favoriteTeams.size > 0 && (
          <ErrorBoundary label="Following">
            <FollowingSection leagues={visibleLeagues} favoriteTeams={favoriteTeams} />
          </ErrorBoundary>
        )}

        {/* Per-slot: skeleton while loading, leagues when ready */}
        {SCORE_SLOTS.map((slotConfig) => {
          const slot = slots[slotConfig.key];

          if (slot.loading) {
            return (
              <LeagueSkeleton
                key={`skeleton-${slotConfig.key}`}
                name={slotConfig.skeletonName}
                count={slotConfig.skeletonCount}
              />
            );
          }

          const slotLeagues = slot.leagues.filter((l) => !settings.hiddenLeagues.includes(l.id));
          if (slotLeagues.length === 0) return null;

          return (
            <Fragment key={slotConfig.key}>
              {slotLeagues.map((league) => (
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
            </Fragment>
          );
        })}

        {/* Sync indicator */}
        <div className="text-center text-[10px] text-gray-600 py-2">
          {hasLive && allLoaded ? (
            <span>Live — updating every 15s</span>
          ) : lastSync ? (
            <span>Updated {formatDistanceToNowStrict(lastSync, { addSuffix: true })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
