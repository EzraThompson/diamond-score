'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { Game } from '@/lib/types';
import Diamond from './Diamond';
import TeamBadge from './TeamBadge';
import StarButton from './StarButton';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';

// ── Count-up animation ────────────────────────────────────────────────

function useCountUp(score: number): number {
  const prevRef = useRef(score);
  const [displayed, setDisplayed] = useState(score);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = prevRef.current;
    const to = score;
    prevRef.current = score;

    if (from === to) return;

    const diff = to - from;
    const duration = Math.min(Math.abs(diff) * 150, 600);
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + diff * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  return displayed;
}

// ── Score-flash: green highlight on change ───────────────────────────

function useScoreFlash(score: number): boolean {
  const prev = useRef(score);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (score !== prev.current) {
      prev.current = score;
      setFlashing(true);
      const id = setTimeout(() => setFlashing(false), 700);
      return () => clearTimeout(id);
    }
  }, [score]);

  return flashing;
}

// ── Outs indicator ────────────────────────────────────────────────────

function Outs({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < count ? 'bg-yellow-400' : 'bg-surface-200'
          }`}
        />
      ))}
    </span>
  );
}

// ── Status display ────────────────────────────────────────────────────

function StatusDisplay({ game }: { game: Game }) {
  if (game.status === 'live') {
    const half = game.inningHalf === 'top' ? 'Top' : game.inningHalf === 'bottom' ? 'Bot' : 'Mid';
    const ordinal = getOrdinal(game.currentInning ?? 0);
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute inline-flex w-full h-full rounded-full bg-live opacity-40 animate-ping" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-live" />
        </span>
        <span className="text-xs font-bold text-live">
          {half} {ordinal}
        </span>
      </div>
    );
  }

  if (game.status === 'final') {
    const extra = game.linescore && game.linescore.length > 9
      ? `/${game.linescore.length}`
      : '';
    return <span className="text-xs font-semibold text-final">Final{extra}</span>;
  }

  if (game.status === 'postponed') {
    return <span className="text-xs font-semibold text-delayed">Postponed</span>;
  }

  if (game.status === 'delayed') {
    return <span className="text-xs font-semibold text-delayed">Delayed</span>;
  }

  const time = format(new Date(game.scheduledTime), 'h:mm a');
  return <span className="text-xs font-medium text-scheduled">{time}</span>;
}

// ── Linescore ─────────────────────────────────────────────────────────

function Linescore({ game }: { game: Game }) {
  if (!game.linescore?.length) return null;

  return (
    <div className="overflow-x-auto no-scrollbar mt-2 pt-2 border-t border-surface-200">
      <table className="linescore-table text-[10px] text-gray-400 w-full">
        <thead>
          <tr>
            <th className="text-left font-semibold w-10" />
            {game.linescore.map((inn) => (
              <th key={inn.inning} className="font-semibold text-gray-400">{inn.inning}</th>
            ))}
            <th className="font-semibold pl-2 border-l border-surface-200 text-gray-500">R</th>
            <th className="font-semibold text-gray-500">H</th>
            <th className="font-semibold text-gray-500">E</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-left font-bold text-[10px] text-gray-500">{game.awayTeam.abbreviation}</td>
            {game.linescore.map((inn) => (
              <td key={inn.inning} className="text-gray-500">{inn.away ?? '-'}</td>
            ))}
            <td className="font-bold pl-2 border-l border-surface-200 text-gray-700">{game.awayScore}</td>
            <td className="text-gray-500">{game.awayHits ?? 0}</td>
            <td className="text-gray-500">{game.awayErrors ?? 0}</td>
          </tr>
          <tr>
            <td className="text-left font-bold text-[10px] text-gray-500">{game.homeTeam.abbreviation}</td>
            {game.linescore.map((inn) => (
              <td key={inn.inning} className="text-gray-500">{inn.home ?? '-'}</td>
            ))}
            <td className="font-bold pl-2 border-l border-surface-200 text-gray-700">{game.homeScore}</td>
            <td className="text-gray-500">{game.homeHits ?? 0}</td>
            <td className="text-gray-500">{game.homeErrors ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────

export default function GameCard({ game }: { game: Game }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const { isTeamFav, toggleTeam } = useFavorites();
  const { settings } = useSettings();

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';
  const homeWon = isFinal && game.homeScore > game.awayScore;
  const awayWon = isFinal && game.awayScore > game.homeScore;

  const spoilerActive = settings.spoilerMode && isFinal && !spoilerRevealed;

  const homeDisplayed = useCountUp(game.homeScore);
  const awayDisplayed = useCountUp(game.awayScore);
  const homeFlashing = useScoreFlash(game.homeScore);
  const awayFlashing = useScoreFlash(game.awayScore);

  function handleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;

    if (target.closest('[data-expand]')) {
      setExpanded((v) => !v);
      return;
    }

    if (target.closest('[data-star]')) {
      return; // handled by StarButton
    }

    if (target.closest('[data-spoiler]')) {
      setSpoilerRevealed(true);
      return;
    }

    router.push(`/game/${game.id}`);
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-surface-50 rounded-xl px-4 py-3 border transition-colors cursor-pointer ${
        isLive
          ? 'border-live/30 shadow-sm shadow-live/10'
          : 'border-surface-200 hover:border-surface-300 hover:bg-surface-100'
      }`}
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        <StatusDisplay game={game} />
        {isLive && game.count && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 tabular-nums font-mono">
              {game.count.balls}-{game.count.strikes}
            </span>
            <Outs count={game.count.outs} />
          </div>
        )}
      </div>

      {/* Teams & scores */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {/* Away */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <TeamBadge abbreviation={game.awayTeam.abbreviation} primaryColor={game.awayTeam.primaryColor} />
            <span className={`text-sm font-bold truncate flex-1 ${
              awayWon ? 'text-gray-900' : isScheduled ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {game.awayTeam.rank && (
                <span className="text-[10px] font-semibold text-gray-400 mr-0.5">
                  #{game.awayTeam.rank}
                </span>
              )}
              {game.awayTeam.abbreviation}
            </span>
            <div data-star className="flex items-center">
              <StarButton
                active={isTeamFav(game.awayTeam.abbreviation)}
                onToggle={(e) => {
                  e.stopPropagation();
                  toggleTeam(game.awayTeam.abbreviation);
                }}
              />
            </div>
            <span
              data-spoiler={spoilerActive ? 'true' : undefined}
              className={`ml-1 text-lg font-semibold tabular-nums font-mono rounded px-0.5 transition-colors ${
                awayWon ? 'text-gray-900' : isScheduled ? 'text-gray-300' : 'text-gray-500'
              } ${awayFlashing ? 'animate-score-flash text-accent' : ''} ${
                spoilerActive ? 'cursor-pointer select-none' : ''
              }`}
            >
              {isScheduled
                ? ''
                : spoilerActive
                ? <span className="tracking-widest text-gray-300">•••</span>
                : awayDisplayed}
            </span>
          </div>
          {/* Home */}
          <div className="flex items-center gap-2.5">
            <TeamBadge abbreviation={game.homeTeam.abbreviation} primaryColor={game.homeTeam.primaryColor} />
            <span className={`text-sm font-bold truncate flex-1 ${
              homeWon ? 'text-gray-900' : isScheduled ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {game.homeTeam.rank && (
                <span className="text-[10px] font-semibold text-gray-400 mr-0.5">
                  #{game.homeTeam.rank}
                </span>
              )}
              {game.homeTeam.abbreviation}
            </span>
            <div data-star className="flex items-center">
              <StarButton
                active={isTeamFav(game.homeTeam.abbreviation)}
                onToggle={(e) => {
                  e.stopPropagation();
                  toggleTeam(game.homeTeam.abbreviation);
                }}
              />
            </div>
            <span
              data-spoiler={spoilerActive ? 'true' : undefined}
              className={`ml-1 text-lg font-semibold tabular-nums font-mono rounded px-0.5 transition-colors ${
                homeWon ? 'text-gray-900' : isScheduled ? 'text-gray-300' : 'text-gray-500'
              } ${homeFlashing ? 'animate-score-flash text-accent' : ''} ${
                spoilerActive ? 'cursor-pointer select-none' : ''
              }`}
            >
              {isScheduled
                ? ''
                : spoilerActive
                ? <span className="tracking-widest text-gray-300">•••</span>
                : homeDisplayed}
            </span>
          </div>
        </div>

        {/* Live: diamond */}
        {isLive && game.runnersOn && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pl-2 border-l border-surface-200">
            <Diamond runners={game.runnersOn} size={32} />
            {game.currentPitcher && (
              <span className="text-[9px] text-gray-400 truncate max-w-[60px]">
                P: {game.currentPitcher.name.split(' ').pop()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Spoiler tap hint */}
      {spoilerActive && (
        <p
          data-spoiler
          className="text-[10px] text-gray-400 text-center mt-2 select-none cursor-pointer"
        >
          Tap score to reveal
        </p>
      )}

      {/* Expandable linescore */}
      {expanded && (game.status === 'live' || game.status === 'final') && !spoilerActive && (
        <Linescore game={game} />
      )}

      {/* Expand hint */}
      {(game.status === 'live' || game.status === 'final') && game.linescore?.length && !spoilerActive && (
        <div className="flex justify-center mt-1" data-expand="true">
          <svg
            className={`w-3.5 h-3.5 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
