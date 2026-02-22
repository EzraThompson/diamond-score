import { NextRequest } from 'next/server';
import { buildScores } from '@/lib/buildScores';
import type { Game } from '@/lib/types';

export const dynamic = 'force-dynamic';

type GameSnapshot = string;

function snapshotGame(g: Game): GameSnapshot {
  return JSON.stringify({
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    status: g.status,
    currentInning: g.currentInning,
    inningHalf: g.inningHalf,
    outs: g.count?.outs,
  });
}

function isPreGame(g: Game): boolean {
  if (g.status !== 'scheduled') return false;
  const msUntil = new Date(g.scheduledTime).getTime() - Date.now();
  return msUntil > 0 && msUntil <= 30 * 60 * 1000;
}

function getInterval(hasLive: boolean, hasPreGame: boolean): number {
  if (hasLive) return 15_000;
  if (hasPreGame) return 60_000;
  return 300_000;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller may be closed
        }
      }

      // Initial full load
      let scores = await buildScores(date);
      send('init', scores);

      // Snapshot current game states for diff detection
      const snapshots = new Map<number, GameSnapshot>();
      for (const league of scores.leagues) {
        for (const game of league.games) {
          snapshots.set(game.id, snapshotGame(game));
        }
      }

      let timer: ReturnType<typeof setTimeout> | undefined;

      function scheduleNext() {
        const hasPreGame = scores.leagues.some((l) => l.games.some(isPreGame));
        const interval = getInterval(scores.hasLive, hasPreGame);

        timer = setTimeout(async () => {
          if (request.signal.aborted) return;

          try {
            scores = await buildScores(date);

            const changedGames: Game[] = [];
            for (const league of scores.leagues) {
              for (const game of league.games) {
                const prev = snapshots.get(game.id);
                const curr = snapshotGame(game);
                if (prev !== curr) {
                  changedGames.push(game);
                  snapshots.set(game.id, curr);
                }
              }
            }

            if (changedGames.length > 0) {
              send('update', { games: changedGames, hasLive: scores.hasLive });
            } else {
              send('ping', { ts: Date.now() });
            }
          } catch {
            // Keep stream alive on transient errors
            send('ping', { ts: Date.now() });
          }

          scheduleNext();
        }, interval);
      }

      scheduleNext();

      request.signal.addEventListener('abort', () => {
        if (timer !== undefined) clearTimeout(timer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
