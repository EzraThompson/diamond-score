'use client';

/** Single pulsing shimmer block. */
function Shimmer({ className }: { className: string }) {
  return (
    <div className={`bg-surface-200 rounded animate-pulse ${className}`} />
  );
}

/**
 * Loading placeholder that mirrors the GameCard layout.
 * Used while scores are being fetched on first load.
 */
export function GameCardSkeleton() {
  return (
    <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-8" />
      </div>

      {/* Away team row */}
      <div className="flex items-center gap-2.5 mb-2">
        <Shimmer className="w-5 h-5 rounded" />
        <Shimmer className="h-3 w-24 flex-1" />
        <Shimmer className="h-6 w-7" />
      </div>

      {/* Home team row */}
      <div className="flex items-center gap-2.5">
        <Shimmer className="w-5 h-5 rounded" />
        <Shimmer className="h-3 w-20 flex-1" />
        <Shimmer className="h-6 w-7" />
      </div>
    </div>
  );
}

/**
 * A collapsed league section placeholder with N card skeletons.
 */
export function LeagueSkeleton({ count = 3, name: _name }: { count?: number; name?: string }) {
  return (
    <section className="mb-4">
      {/* League header row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Shimmer className="w-5 h-5 rounded" />
        <Shimmer className="h-2.5 w-20" />
        <div className="flex-1" />
        <Shimmer className="h-2.5 w-4" />
        <Shimmer className="w-3.5 h-3.5 rounded" />
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 px-4">
        {Array.from({ length: count }, (_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
