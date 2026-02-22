interface TeamBadgeProps {
  abbreviation: string;
  primaryColor?: string;
  size?: 'sm' | 'lg';
}

export default function TeamBadge({
  abbreviation,
  primaryColor = '#18A34A',
  size = 'sm',
}: TeamBadgeProps) {
  if (size === 'lg') {
    return (
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/10"
        style={{ backgroundColor: primaryColor }}
      >
        <span
          className="text-white font-extrabold tracking-tight leading-none select-none"
          style={{ fontSize: abbreviation.length > 2 ? '13px' : '16px' }}
        >
          {abbreviation}
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-black/10"
      style={{ backgroundColor: primaryColor }}
    >
      <span
        className="text-white font-extrabold tracking-tight leading-none select-none"
        style={{ fontSize: abbreviation.length > 2 ? '7px' : '9px' }}
      >
        {abbreviation}
      </span>
    </div>
  );
}
