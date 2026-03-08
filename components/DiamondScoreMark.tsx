interface DiamondScoreMarkProps {
  size?: number;
}

// The icon mark from the DiamondScore logo design.
// 52×52 viewBox with grid locked to diamond corners.
export default function DiamondScoreMark({ size = 32 }: DiamondScoreMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      style={{ flexShrink: 0, position: 'relative', zIndex: 10 }}
    >
      {/* Grid lines — faint chalk, scoreboard skeleton */}
      <line x1="0"  y1="14" x2="52" y2="14" stroke="rgba(210,240,200,0.22)" strokeWidth="0.65"/>
      <line x1="0"  y1="38" x2="52" y2="38" stroke="rgba(210,240,200,0.22)" strokeWidth="0.65"/>
      <line x1="14" y1="0"  x2="14" y2="52" stroke="rgba(210,240,200,0.22)" strokeWidth="0.65"/>
      <line x1="38" y1="0"  x2="38" y2="52" stroke="rgba(210,240,200,0.22)" strokeWidth="0.65"/>

      {/* Diamond fill — very subtle */}
      <path d="M26 5.5 L46.5 26 L26 46.5 L5.5 26 Z" fill="rgba(220,248,210,0.055)"/>

      {/* Diamond outline — chalk stroke */}
      <path
        d="M26 5.5 L46.5 26 L26 46.5 L5.5 26 Z"
        stroke="rgba(220,248,210,0.78)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Foul lines from home toward 1st and 3rd */}
      <line x1="26" y1="46.5" x2="46.5" y2="26" stroke="rgba(220,248,210,0.12)" strokeWidth="0.5"/>
      <line x1="26" y1="46.5" x2="5.5"  y2="26" stroke="rgba(220,248,210,0.12)" strokeWidth="0.5"/>

      {/* 2nd base (top) */}
      <rect x="23.2" y="2.8"  width="5.6" height="5.6" rx="1"
            fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.7)"  strokeWidth="1.1"/>
      {/* 1st base (right) */}
      <rect x="43.7" y="23.2" width="5.6" height="5.6" rx="1"
            fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.62)" strokeWidth="1.1"/>
      {/* 3rd base (left) */}
      <rect x="2.8"  y="23.2" width="5.6" height="5.6" rx="1"
            fill="rgba(220,248,210,0.14)" stroke="rgba(220,248,210,0.62)" strokeWidth="1.1"/>
      {/* Home plate (bottom) — bolder */}
      <rect x="23.2" y="43.7" width="5.6" height="5.6" rx="1"
            fill="rgba(220,248,210,0.22)" stroke="rgba(220,248,210,0.82)" strokeWidth="1.3"/>

      {/* Pitcher's mound — subtle dot at center */}
      <circle cx="26" cy="26" r="1.4" fill="rgba(220,248,210,0.28)"/>

      {/* Chalk dust smudge near home */}
      <line x1="20" y1="49.5" x2="32" y2="49.5"
            stroke="rgba(220,248,210,0.08)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
