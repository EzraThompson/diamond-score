import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Splash screen generator for iOS add-to-home-screen startup images.
// Returns a PNG at the requested pixel dimensions.
export async function GET(
  _request: NextRequest,
  { params }: { params: { width: string; height: string } },
) {
  const width = Math.min(parseInt(params.width) || 1170, 2796);
  const height = Math.min(parseInt(params.height) || 2532, 2796);

  // Icon geometry — fixed 260px icon centered on screen
  const iconSize = 260;
  const diamondSpan = Math.round(iconSize * 0.42);
  const cx = iconSize / 2;
  const cy = iconSize / 2;
  const innerSpan = Math.round(iconSize * 0.26);

  const outerPts = [
    [cx, cy - diamondSpan],
    [cx + diamondSpan, cy],
    [cx, cy + diamondSpan],
    [cx - diamondSpan, cy],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  const innerPts = [
    [cx, cy - innerSpan],
    [cx + innerSpan, cy],
    [cx, cy + innerSpan],
    [cx - innerSpan, cy],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          background: '#F2FAF2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {/* App icon */}
        <div
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: Math.round(iconSize * 0.208),
            background: 'linear-gradient(135deg, #0C2A0C 0%, #18A34A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <svg
            viewBox={`0 0 ${iconSize} ${iconSize}`}
            width={iconSize}
            height={iconSize}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <polygon points={outerPts} fill="white" opacity="0.95" />
            <polygon
              points={innerPts}
              fill="none"
              stroke="#18A34A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <circle cx={cx} cy={cy + Math.round(diamondSpan * 0.85)} r="6" fill="#18A34A" />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#0C1F0C',
              letterSpacing: -1,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            DiamondScore
          </div>
          <div
            style={{
              fontSize: 18,
              color: '#5F7A5F',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Live Baseball Scores
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'image/png',
      },
    },
  );
}
