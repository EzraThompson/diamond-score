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

  // Diamond geometry — all values proportional to size
  const cx = size / 2;
  const cy = size / 2;
  const outerSpan = Math.round(size * 0.286); // half-span of outer diamond
  const innerSpan = Math.round(size * 0.177); // half-span of inner diamond
  const homePlateY = cy + Math.round(outerSpan * 0.917);
  const homePlateR = Math.round(size * 0.026);

  const outerPts = [
    [cx, cy - outerSpan],
    [cx + outerSpan, cy],
    [cx, cy + outerSpan],
    [cx - outerSpan, cy],
  ];
  const innerPts = [
    [cx, cy - innerSpan],
    [cx + innerSpan, cy],
    [cx, cy + innerSpan],
    [cx - innerSpan, cy],
  ];

  function pts(arr: number[][]): string {
    return arr.map(([x, y]) => `${x},${y}`).join(' ');
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0C2A0C 0%, #18A34A 100%)',
          borderRadius: radius,
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Outer field diamond */}
          <polygon points={pts(outerPts)} fill="white" opacity="0.95" />
          {/* Basepath lines */}
          <polygon
            points={pts(innerPts)}
            fill="none"
            stroke="#18A34A"
            strokeWidth={Math.round(size * 0.021)}
            strokeLinejoin="round"
          />
          {/* Home plate */}
          <circle cx={cx} cy={homePlateY} r={homePlateR} fill="#18A34A" />
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
