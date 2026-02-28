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
          <svg width="28" height="28" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '8px', display: 'block', flexShrink: 0 }}>
            <rect width="52" height="52" fill="#1a2c18"/>
            <line x1="14" y1="0" x2="14" y2="52" stroke="rgba(210,240,200,0.3)" strokeWidth="1"/>
            <line x1="38" y1="0" x2="38" y2="52" stroke="rgba(210,240,200,0.3)" strokeWidth="1"/>
            <line x1="0" y1="14" x2="52" y2="14" stroke="rgba(210,240,200,0.3)" strokeWidth="1"/>
            <line x1="0" y1="38" x2="52" y2="38" stroke="rgba(210,240,200,0.3)" strokeWidth="1"/>
            <path d="M26 5.5 L46.5 26 L26 46.5 L5.5 26 Z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" fill="none"/>
            <rect x="23.2" y="2.7" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)"/>
            <rect x="43.7" y="23.2" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)"/>
            <rect x="23.2" y="43.7" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)"/>
            <rect x="2.7" y="23.2" width="5.6" height="5.6" rx="1" fill="rgba(255,255,255,0.9)"/>
            <circle cx="26" cy="26" r="1.8" fill="rgba(255,255,255,0.7)"/>
          </svg>
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
