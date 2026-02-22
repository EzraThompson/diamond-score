import type { RunnersOn } from '@/lib/types';

interface DiamondProps {
  runners: RunnersOn;
  size?: number;
}

export default function Diamond({ runners, size = 28 }: DiamondProps) {
  const s = size;
  const half = s / 2;
  const baseSize = s * 0.22;
  const off = s * 0.08;

  // Diamond positions: home=bottom, 1B=right, 2B=top, 3B=left
  const bases = [
    { x: half + baseSize + off, y: half,                  on: runners.first,  label: '1B' },
    { x: half,                  y: half - baseSize - off,  on: runners.second, label: '2B' },
    { x: half - baseSize - off, y: half,                  on: runners.third,  label: '3B' },
  ];

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
      {/* Diamond outline */}
      <polygon
        points={`${half},${off} ${s - off},${half} ${half},${s - off} ${off},${half}`}
        fill="none"
        stroke="#3a4560"
        strokeWidth="1"
      />
      {bases.map((b) => (
        <rect
          key={b.label}
          x={b.x - baseSize / 2}
          y={b.y - baseSize / 2}
          width={baseSize}
          height={baseSize}
          rx={1}
          transform={`rotate(45 ${b.x} ${b.y})`}
          fill={b.on ? '#f59e0b' : '#283550'}
          stroke={b.on ? '#f59e0b' : '#3a4560'}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
