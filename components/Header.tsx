'use client';

import { isToday } from 'date-fns';

interface HeaderProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export default function Header({ date, onDateChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-surface-50/95 backdrop-blur-sm border-b border-surface-200">
      <div className="flex items-center justify-between px-4 h-12 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 6v2M12 16v2M6 12h2M16 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-gray-900">DiamondScore</h1>
        </div>
        <button
          onClick={() => onDateChange(new Date())}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
            isToday(date)
              ? 'bg-accent text-white'
              : 'bg-surface-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          Today
        </button>
      </div>
    </header>
  );
}
