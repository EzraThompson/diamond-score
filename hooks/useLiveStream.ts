'use client';

import { useEffect, useRef } from 'react';
import type { Game } from '@/lib/types';
import type { LeagueGroup, ScoresResult } from '@/lib/buildScores';

interface UseLiveStreamOptions {
  date: string;
  onInit: (data: ScoresResult) => void;
  onUpdate: (games: Game[], hasLive: boolean) => void;
  enabled: boolean;
}

export function useLiveStream({ date, onInit, onUpdate, enabled }: UseLiveStreamOptions) {
  // Use refs for callbacks so the effect doesn't need to re-run when they change
  const onInitRef = useRef(onInit);
  const onUpdateRef = useRef(onUpdate);
  onInitRef.current = onInit;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    // ── Polling fallback if SSE not available ───────────────────────
    if (typeof EventSource === 'undefined') {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout>;

      const poll = async (): Promise<void> => {
        try {
          const res = await fetch(`/api/scores?date=${date}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`${res.status}`);
          const data: ScoresResult = await res.json();
          onInitRef.current(data);
          if (!cancelled) {
            const interval = data.hasLive ? 15_000 : 300_000;
            timer = setTimeout(poll, interval);
          }
        } catch {
          if (!cancelled) timer = setTimeout(poll, 30_000);
        }
      };

      poll();
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    // ── SSE path ────────────────────────────────────────────────────
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = 2_000;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      es = new EventSource(`/api/live-stream?date=${date}`);

      es.addEventListener('init', (e: MessageEvent) => {
        reconnectDelay = 2_000; // reset backoff on successful connection
        const data: ScoresResult = JSON.parse(e.data);
        onInitRef.current(data);
      });

      es.addEventListener('update', (e: MessageEvent) => {
        const { games, hasLive } = JSON.parse(e.data) as { games: Game[]; hasLive: boolean };
        onUpdateRef.current(games, hasLive);
      });

      // 'ping' events are no-ops — just keepalives

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 60_000);
            connect();
          }, reconnectDelay);
        }
      };
    }

    connect();

    // Disconnect when tab is hidden, reconnect when visible
    function onVisibilityChange() {
      if (document.hidden) {
        if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
        es?.close();
        es = null;
      } else {
        reconnectDelay = 2_000;
        connect();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      destroyed = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      es?.close();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [date, enabled]);
}
