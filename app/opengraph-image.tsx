import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Play-O-Graph — Live Baseball Scores';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0C2A0C 0%, #1a3d1a 50%, #0C2A0C 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Diamond icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 52 52"
          fill="none"
          style={{ marginBottom: 24 }}
        >
          <path
            d="M26 5.5 L46.5 26 L26 46.5 L5.5 26 Z"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
            fill="none"
          />
          <rect x="23.2" y="2.7" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)" />
          <rect x="43.7" y="23.2" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)" />
          <rect x="23.2" y="43.7" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)" />
          <rect x="2.7" y="23.2" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)" />
          <circle cx="26" cy="26" r="2" fill="rgba(255,255,255,0.7)" />
        </svg>

        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          Play-O-Graph
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(210,240,200,0.85)',
            marginBottom: 32,
          }}
        >
          Live Baseball Scores
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
          }}
        >
          {['MLB', 'KBO', 'NPB', 'MiLB', 'NCAA'].map((league) => (
            <div
              key={league}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {league}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
