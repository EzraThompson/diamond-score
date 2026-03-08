'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { Game } from '@/lib/types';
import type { ClutchStyle, ScoreAnimation } from '@/contexts/SettingsContext';
import { calculateLeverageIndex, type LeverageResult } from '@/lib/leverageIndex';
import Diamond from './Diamond';
import TeamBadge from './TeamBadge';
import StarButton from './StarButton';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';

// ── Score transition hook (replaces useCountUp) ──────────────────────

type TransitionPhase = 'idle' | 'exit' | 'enter';

interface ScoreTransitionState {
  displayed: number;
  previous: number | null;
  phase: TransitionPhase;
}

function useScoreTransition(score: number, duration = 400): ScoreTransitionState {
  const prevRef = useRef(score);
  const [state, setState] = useState<ScoreTransitionState>({
    displayed: score,
    previous: null,
    phase: 'idle',
  });

  useEffect(() => {
    const from = prevRef.current;
    const to = score;
    prevRef.current = score;
    if (from === to) return;

    setState({ displayed: to, previous: from, phase: 'exit' });

    const enterTimer = setTimeout(() => {
      setState({ displayed: to, previous: from, phase: 'enter' });
    }, duration / 2);

    const idleTimer = setTimeout(() => {
      setState({ displayed: to, previous: null, phase: 'idle' });
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(idleTimer);
    };
  }, [score, duration]);

  return state;
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

// ── ScoreDisplay component ───────────────────────────────────────────

function ScoreDisplay({
  score,
  className,
  animation,
}: {
  score: number;
  className: string;
  animation: ScoreAnimation;
}) {
  const { displayed, previous, phase } = useScoreTransition(
    score,
    animation === 'pop' ? 450 : 400,
  );
  const flashing = useScoreFlash(score);

  const flashClass = flashing ? 'animate-score-flash text-accent' : '';

  if (animation === 'slide') {
    return (
      <span className={`relative overflow-hidden inline-flex items-center justify-end ${className} ${flashClass}`}>
        {phase === 'exit' && previous !== null && (
          <span className="absolute inset-0 flex items-center justify-end animate-score-slide-out">
            {previous}
          </span>
        )}
        <span className={
          phase === 'enter' ? 'animate-score-slide-in' : phase === 'exit' ? 'opacity-0' : ''
        }>
          {displayed}
        </span>
      </span>
    );
  }

  if (animation === 'pop') {
    return (
      <span className={`inline-flex items-center justify-end ${className} ${flashClass}`}>
        {phase === 'exit' && previous !== null ? (
          <span className="inline-block animate-score-shrink-out">{previous}</span>
        ) : phase === 'enter' ? (
          <span className="inline-block animate-score-pop-in text-accent">{displayed}</span>
        ) : (
          displayed
        )}
      </span>
    );
  }

  // flip
  return (
    <span className={`inline-flex items-center justify-end ${className} ${flashClass}`} style={{ transformStyle: 'preserve-3d' }}>
      {phase === 'exit' && previous !== null ? (
        <span className="inline-block animate-score-flip-out origin-bottom">{previous}</span>
      ) : phase === 'enter' ? (
        <span className="inline-block animate-score-flip-in origin-top text-accent">{displayed}</span>
      ) : (
        displayed
      )}
    </span>
  );
}

// ── Clutch badge ─────────────────────────────────────────────────────

function ClutchBadge({ leverage, style }: { leverage: LeverageResult; style: ClutchStyle }) {
  if (!leverage.isClutch) return null;

  if (style === 'subtle') {
    return (
      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full tabular-nums">
        Clutch
      </span>
    );
  }

  if (style === 'bold') {
    return (
      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
        leverage.intensity === 'extreme'
          ? 'text-red-700 bg-red-100 animate-pulse'
          : 'text-amber-700 bg-amber-100'
      }`}>
        {leverage.intensity === 'extreme' ? 'Clutch!' : 'Clutch'}
      </span>
    );
  }

  // dramatic — badge is inside the banner, not inline
  return null;
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
  return <time dateTime={game.scheduledTime} className="text-xs font-medium text-scheduled">{time}</time>;
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

// ── Card content (shared between clutch wrappers) ─────────────────────

function CardContent({
  game,
  leverage,
  clutchStyle,
  scoreAnimation,
  isLive,
  isFinal,
  isScheduled,
  homeWon,
  awayWon,
  spoilerActive,
  spoilerRevealed,
  setSpoilerRevealed,
  expanded,
  setExpanded,
  router,
}: {
  game: Game;
  leverage: LeverageResult;
  clutchStyle: ClutchStyle;
  scoreAnimation: ScoreAnimation;
  isLive: boolean;
  isFinal: boolean;
  isScheduled: boolean;
  homeWon: boolean;
  awayWon: boolean;
  spoilerActive: boolean;
  spoilerRevealed: boolean;
  setSpoilerRevealed: (v: boolean) => void;
  expanded: boolean;
  setExpanded: (fn: (v: boolean) => boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { isTeamFav, toggleTeam } = useFavorites();

  function handleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-expand]')) { setExpanded((v) => !v); return; }
    if (target.closest('[data-star]')) return;
    if (target.closest('[data-spoiler]')) { setSpoilerRevealed(true); return; }
    router.push(`/game/${game.id}?league=${game.league.id}`);
  }

  // Score classes (shared base)
  const scoreBase = 'ml-1 w-8 text-right text-xl font-bold tabular-nums font-mono rounded px-0.5 transition-colors';
  const awayScoreColor = awayWon ? 'text-gray-900' : isScheduled ? 'text-gray-300' : isLive ? 'text-gray-600' : 'text-gray-400';
  const homeScoreColor = homeWon ? 'text-gray-900' : isScheduled ? 'text-gray-300' : isLive ? 'text-gray-600' : 'text-gray-400';

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={handleClick}>
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusDisplay game={game} />
          {clutchStyle === 'dramatic' && leverage.isClutch && (
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: '#fff8ec', border: '1px solid #f0d080', color: '#b07d10' }}
            >
              Big Moment
            </span>
          )}
          {(clutchStyle === 'subtle' || clutchStyle === 'bold') && (
            <ClutchBadge leverage={leverage} style={clutchStyle} />
          )}
        </div>
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
          <div className="flex items-center gap-2 mb-1.5">
            <TeamBadge abbreviation={game.awayTeam.abbreviation} primaryColor={game.awayTeam.primaryColor} logoUrl={game.awayTeam.logoUrl} showLogo={game.league.id === 20} />
            <span className={`text-sm font-bold truncate flex-1 min-w-0 ${
              awayWon ? 'text-gray-900' : isScheduled ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {game.awayTeam.rank && (
                <span className="text-[10px] font-semibold text-gray-400 mr-0.5">
                  #{game.awayTeam.rank}
                </span>
              )}
              <span className="inline-block w-10">{game.awayTeam.abbreviation}</span>
              {game.awayTeam.wins !== undefined && (
                <span className="text-[10px] font-medium text-gray-400 ml-1 tabular-nums">
                  {game.awayTeam.wins}-{game.awayTeam.losses}
                </span>
              )}
            </span>
            <div data-star className="flex items-center">
              <StarButton
                active={isTeamFav(game.awayTeam.abbreviation)}
                onToggle={(e) => { e.stopPropagation(); toggleTeam(game.awayTeam.abbreviation); }}
              />
            </div>
            {isScheduled ? (
              <span className={`${scoreBase} text-gray-300`} />
            ) : spoilerActive ? (
              <span data-spoiler="true" className={`${scoreBase} ${awayScoreColor} cursor-pointer select-none`}>
                <span className="tracking-widest text-gray-300">•••</span>
              </span>
            ) : (
              <ScoreDisplay score={game.awayScore} className={`${scoreBase} ${awayScoreColor}`} animation={scoreAnimation} />
            )}
          </div>
          {/* Home */}
          <div className="flex items-center gap-2">
            <TeamBadge abbreviation={game.homeTeam.abbreviation} primaryColor={game.homeTeam.primaryColor} logoUrl={game.homeTeam.logoUrl} showLogo={game.league.id === 20} />
            <span className={`text-sm font-bold truncate flex-1 min-w-0 ${
              homeWon ? 'text-gray-900' : isScheduled ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {game.homeTeam.rank && (
                <span className="text-[10px] font-semibold text-gray-400 mr-0.5">
                  #{game.homeTeam.rank}
                </span>
              )}
              <span className="inline-block w-10">{game.homeTeam.abbreviation}</span>
              {game.homeTeam.wins !== undefined && (
                <span className="text-[10px] font-medium text-gray-400 ml-1 tabular-nums">
                  {game.homeTeam.wins}-{game.homeTeam.losses}
                </span>
              )}
            </span>
            <div data-star className="flex items-center">
              <StarButton
                active={isTeamFav(game.homeTeam.abbreviation)}
                onToggle={(e) => { e.stopPropagation(); toggleTeam(game.homeTeam.abbreviation); }}
              />
            </div>
            {isScheduled ? (
              <span className={`${scoreBase} text-gray-300`} />
            ) : spoilerActive ? (
              <span data-spoiler="true" className={`${scoreBase} ${homeScoreColor} cursor-pointer select-none`}>
                <span className="tracking-widest text-gray-300">•••</span>
              </span>
            ) : (
              <ScoreDisplay score={game.homeScore} className={`${scoreBase} ${homeScoreColor}`} animation={scoreAnimation} />
            )}
          </div>
        </div>

        {/* Live: diamond */}
        {isLive && game.count && game.runnersOn && (
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-[68px] pl-1.5 border-l border-surface-200">
            <Diamond runners={game.runnersOn} size={28} />
            {(game.currentBatter || game.currentPitcher) && (
              <div className="flex flex-col items-center text-[8px] text-gray-400 leading-tight w-full">
                {game.currentBatter && (
                  <span className="truncate w-full text-center">
                    AB: {game.currentBatter.name.split(' ').pop()}
                  </span>
                )}
                {game.currentPitcher && (
                  <span className="truncate w-full text-center">
                    P: {game.currentPitcher.name.split(' ').pop()}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Probable pitchers + TV for scheduled games */}
      <ScheduledInfo game={game} />

      {/* Spoiler tap hint */}
      {spoilerActive && (
        <p data-spoiler className="text-[10px] text-gray-400 text-center mt-2 select-none cursor-pointer">
          Tap score to reveal
        </p>
      )}

      {/* Expandable linescore */}
      {expanded && (game.status === 'live' || game.status === 'final') && !spoilerActive && (
        <Linescore game={game} />
      )}

      {/* Expand hint */}
      {(game.status === 'live' || game.status === 'final') && game.linescore?.length && !spoilerActive && (
        <div className="flex justify-center" data-expand="true">
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

// ── Main card ─────────────────────────────────────────────────────────

export default function GameCard({ game }: { game: Game }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const { settings } = useSettings();

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';
  const homeWon = isFinal && game.homeScore > game.awayScore;
  const awayWon = isFinal && game.awayScore > game.homeScore;
  const spoilerActive = settings.spoilerMode && isFinal && !spoilerRevealed;

  const leverage = calculateLeverageIndex(game);
  const clutchStyle = settings.clutchStyle ?? 'bold';
  const scoreAnimation = settings.scoreAnimation ?? 'slide';

  const contentProps = {
    game, leverage, clutchStyle, scoreAnimation,
    isLive, isFinal, isScheduled, homeWon, awayWon,
    spoilerActive, spoilerRevealed, setSpoilerRevealed,
    expanded, setExpanded, router,
  };

  // ── Clutch card wrappers ──

  // Dramatic: animated gradient border wrapper
  if (clutchStyle === 'dramatic' && leverage.isClutch) {
    return (
      <div
        className="rounded-xl cursor-pointer px-4 pt-3 pb-2 bg-surface-50"
        style={{
          border: '1.5px solid #f0dfa0',
          boxShadow: '0 0 0 4px rgba(245,166,35,0.08)',
        }}
      >
        <CardContent {...contentProps} />
      </div>
    );
  }

  // Bold: pulsing glow + tinted background
  if (clutchStyle === 'bold' && leverage.isClutch) {
    const cls = leverage.intensity === 'extreme'
      ? 'border-red-400/60 animate-clutch-pulse-intense bg-amber-50/30'
      : 'border-amber-400/50 animate-clutch-pulse bg-amber-50/20';
    return (
      <div className={`bg-surface-50 rounded-xl px-4 pt-3 pb-2 border transition-colors cursor-pointer ${cls}`}>
        <CardContent {...contentProps} />
      </div>
    );
  }

  // Subtle: amber border only
  if (clutchStyle === 'subtle' && leverage.isClutch) {
    return (
      <div className="bg-surface-50 rounded-xl px-4 pt-3 pb-2 border border-amber-400/50 shadow-sm shadow-amber-400/15 transition-colors cursor-pointer">
        <CardContent {...contentProps} />
      </div>
    );
  }

  // Default (non-clutch or non-live)
  return (
    <div className={`bg-surface-50 rounded-xl px-4 pt-3 pb-2 border transition-colors cursor-pointer ${
      isLive
        ? 'border-live/30 shadow-sm shadow-live/10'
        : 'border-surface-200 hover:border-surface-300 hover:bg-surface-100'
    }`}>
      <CardContent {...contentProps} />
    </div>
  );
}

// ── Scheduled game info (probable pitchers + TV) ──────────────────────

function ScheduledInfo({ game }: { game: Game }) {
  if (game.status !== 'scheduled') return null;

  const hasPitchers = game.homeProbablePitcher || game.awayProbablePitcher;
  const hasTV = game.tvNetworks?.length;

  if (!hasPitchers && !hasTV) return null;

  const awayLast = game.awayProbablePitcher?.name.split(' ').pop() ?? 'TBD';
  const homeLast = game.homeProbablePitcher?.name.split(' ').pop() ?? 'TBD';

  return (
    <div className="mt-1.5 pt-1.5 border-t border-surface-100 flex items-center gap-2 flex-wrap">
      {hasPitchers && (
        <span className="text-[10px] text-gray-400">
          P: {awayLast} vs. {homeLast}
        </span>
      )}
      {hasPitchers && hasTV && (
        <span className="text-[10px] text-surface-300">|</span>
      )}
      {hasTV && (
        <span className="text-[10px] text-gray-400">
          {game.tvNetworks!.slice(0, 2).join(', ')}
        </span>
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
