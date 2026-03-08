import Image from 'next/image';

interface TeamBadgeProps {
  abbreviation: string;
  primaryColor?: string;
  logoUrl?: string;
  /** When true, renders the logo image if logoUrl is provided. Defaults to false
   *  so non-WBC leagues always display the three-letter abbreviation. */
  showLogo?: boolean;
  size?: 'sm' | 'lg';
}

export default function TeamBadge({
  abbreviation,
  primaryColor = '#18A34A',
  logoUrl,
  showLogo = false,
  size = 'sm',
}: TeamBadgeProps) {
  const resolvedLogo = showLogo ? logoUrl : undefined;
  const bgColor = resolvedLogo ? '#e5e7eb' : primaryColor;

  if (size === 'lg') {
    return (
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/10 relative overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {resolvedLogo ? (
          <Image
            src={resolvedLogo}
            alt={abbreviation}
            fill
            className="object-contain p-1"
            unoptimized={/\.svg$/i.test(resolvedLogo) || /\.gif$/i.test(resolvedLogo)}
            loading="lazy"
          />
        ) : (
          <span
            className="text-white font-extrabold tracking-tight leading-none select-none"
            style={{ fontSize: abbreviation.length > 2 ? '13px' : '16px' }}
          >
            {abbreviation}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-black/10 relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {resolvedLogo ? (
        <Image
          src={resolvedLogo}
          alt={abbreviation}
          fill
          className="object-contain p-0.5"
          unoptimized={/\.svg$/i.test(resolvedLogo) || /\.gif$/i.test(resolvedLogo)}
          loading="lazy"
        />
      ) : (
        <span
          className="text-white font-extrabold tracking-tight leading-none select-none"
          style={{ fontSize: abbreviation.length > 2 ? '7px' : '9px' }}
        >
          {abbreviation}
        </span>
      )}
    </div>
  );
}
