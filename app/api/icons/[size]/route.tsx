import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const VALID_SIZES = new Set(['192', '512', '180']);

export async function GET(
  _request: NextRequest,
  { params }: { params: { size: string } },
) {
  const sizeStr = VALID_SIZES.has(params.size) ? params.size : '192';
  const size = parseInt(sizeStr);
  const isMaskable = size === 512;
  const radius = isMaskable ? 0 : Math.round(size * 0.208); // ~40px at 192

  // Scale factor: design uses 52×52 viewBox, scale to icon size
  const sc = size / 52;
  const r = (n: number) => Math.round(n * sc);

  // Grid lines at 14 and 38 in viewBox coords
  const g1 = r(14);
  const g2 = r(38);
  const gridW = Math.max(1, r(0.65));

  // Diamond path: (26,5.5), (46.5,26), (26,46.5), (5.5,26)
  const diamond = `M${r(26)},${r(5.5)} L${r(46.5)},${r(26)} L${r(26)},${r(46.5)} L${r(5.5)},${r(26)} Z`;
  const diamondW = Math.max(1, r(1.4));

  // Base squares
  const bx1 = r(23.2); const bx2 = r(43.7); const bx3 = r(2.8);
  const by1 = r(2.8);  const by2 = r(23.2); const by3 = r(43.7);
  const bw  = r(5.6);  const brx = Math.max(1, r(1));
  const swB = Math.max(1, r(1.1));
  const swH = Math.max(1, r(1.3));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a2c18',
          borderRadius: radius,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Grid lines */}
          <line x1="0" y1={g1} x2={size} y2={g1} stroke="rgba(210,240,200,0.24)" strokeWidth={gridW} />
          <line x1="0" y1={g2} x2={size} y2={g2} stroke="rgba(210,240,200,0.24)" strokeWidth={gridW} />
          <line x1={g1} y1="0" x2={g1} y2={size} stroke="rgba(210,240,200,0.24)" strokeWidth={gridW} />
          <line x1={g2} y1="0" x2={g2} y2={size} stroke="rgba(210,240,200,0.24)" strokeWidth={gridW} />
          {/* Diamond fill */}
          <path d={diamond} fill="rgba(220,248,210,0.06)" />
          {/* Diamond outline */}
          <path d={diamond} stroke="rgba(220,248,210,0.82)" strokeWidth={diamondW} strokeLinejoin="round" fill="none" />
          {/* Inner foul lines */}
          <line x1={r(26)} y1={r(46.5)} x2={r(46.5)} y2={r(26)} stroke="rgba(220,248,210,0.13)" strokeWidth={Math.max(1, r(0.5))} />
          <line x1={r(26)} y1={r(46.5)} x2={r(5.5)}  y2={r(26)} stroke="rgba(220,248,210,0.13)" strokeWidth={Math.max(1, r(0.5))} />
          {/* Top (2nd base) */}
          <rect x={bx1} y={by1} width={bw} height={bw} rx={brx} fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.72)" strokeWidth={swB} />
          {/* Right (1st base) */}
          <rect x={bx2} y={by2} width={bw} height={bw} rx={brx} fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.64)" strokeWidth={swB} />
          {/* Left (3rd base) */}
          <rect x={bx3} y={by2} width={bw} height={bw} rx={brx} fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.64)" strokeWidth={swB} />
          {/* Bottom (home plate) */}
          <rect x={bx1} y={by3} width={bw} height={bw} rx={brx} fill="rgba(220,248,210,0.22)" stroke="rgba(220,248,210,0.85)" strokeWidth={swH} />
          {/* Pitcher's mound */}
          <circle cx={r(26)} cy={r(26)} r={Math.max(1, r(1.4))} fill="rgba(220,248,210,0.3)" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    },
  );
}
