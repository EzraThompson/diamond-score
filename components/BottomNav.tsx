'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { NavTab } from '@/lib/types';

const tabs: { key: NavTab; label: string; icon: string; href: string }[] = [
  { key: 'scores', label: 'Scores', icon: '&#9776;', href: '/' },
  { key: 'standings', label: 'Standings', icon: '&#9733;', href: '/standings' },
  { key: 'schedule', label: 'Schedule', icon: '&#128197;', href: '/schedule' },
  { key: 'settings', label: 'Settings', icon: '&#9881;', href: '/settings' },
];

function NavIcon({ tab }: { tab: string }) {
  if (tab === 'scores') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    );
  }
  if (tab === 'standings') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 21v-8m4 8V9m4 12v-5m-8-4V3m4 2V3m4 4V3" strokeLinecap="round" />
      </svg>
    );
  }
  if (tab === 'schedule') {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-50 border-t border-surface-200 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                active ? 'text-accent' : 'text-gray-400'
              }`}
            >
              <NavIcon tab={tab.key} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
