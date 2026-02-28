import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import type { GameDetail } from '@/lib/types';

export const runtime = 'edge';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://diamondscore.app';

async function fetchGame(id: string): Promise<GameDetail | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/game/${id}`);
    if (!res.ok) return null;
    return res.json() as Promise<GameDetail>;
  } catch {
    return null;
  }
}

function statusLabel(game: GameDetail): string {
  if (game.status === 'final') return 'Final';
  if (game.status === 'live') {
    const half = game.inningHalf === 'top' ? 'Top' : game.inningHalf === 'bottom' ? 'Bot' : '';
    return game.currentInning ? `${half} ${game.currentInning}` : 'Live';
  }
  if (game.scheduledTime) {
    return new Date(game.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  }
  return 'Scheduled';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const game = await fetchGame(params.id);

  const away = game?.awayTeam.abbreviation ?? '???';
  const home = game?.homeTeam.abbreviation ?? '???';
  const awayScore = game?.awayScore ?? '';
  const homeScore = game?.homeScore ?? '';
  const awayColor = game?.awayColor ?? game?.awayTeam.primaryColor ?? '#18A34A';
  const homeColor = game?.homeColor ?? game?.homeTeam.primaryColor ?? '#18A34A';
  const status = game ? statusLabel(game) : '';
  const isLive = game?.status === 'live';
  const isFinal = game?.status === 'final';
  const showScore = isFinal || isLive;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0C2A0C',
          fontFamily: 'system-ui, sans-serif',
          gap: '32px',
        }}
      >
        {/* Teams row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
          }}
        >
          {/* Away team */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '24px',
                background: awayColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 800 }}>{away}</span>
            </div>
            {showScore && (
              <span style={{ color: 'white', fontSize: '64px', fontWeight: 900, lineHeight: 1 }}>
                {awayScore}
              </span>
            )}
          </div>

          {/* Separator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4ADE80', fontSize: '28px', fontWeight: 700 }}>
              {showScore ? '–' : '@'}
            </span>
            <span
              style={{
                color: isLive ? '#4ADE80' : '#9CA3AF',
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              {status}
            </span>
          </div>

          {/* Home team */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '24px',
                background: homeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 800 }}>{home}</span>
            </div>
            {showScore && (
              <span style={{ color: 'white', fontSize: '64px', fontWeight: 900, lineHeight: 1 }}>
                {homeScore}
              </span>
            )}
          </div>
        </div>

        {/* Wordmark */}
        <span style={{ color: '#4ADE80', fontSize: '22px', fontWeight: 700, letterSpacing: '0.05em' }}>
          DiamondScore
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  return response;
}
