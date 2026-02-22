'use client';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-surface-200 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Wifi-off icon */}
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
          No internet connection. Previously loaded scores and standings may still be
          available — tap the tab below to check.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 active:opacity-75 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
