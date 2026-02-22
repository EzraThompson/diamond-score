'use client';

interface StarButtonProps {
  active: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: number;
  className?: string;
}

export default function StarButton({
  active,
  onToggle,
  size = 14,
  className = '',
}: StarButtonProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={active ? 'Unfollow team' : 'Follow team'}
      className={`flex-shrink-0 transition-transform active:scale-110 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? '#F59E0B' : 'none'}
        stroke={active ? '#F59E0B' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
