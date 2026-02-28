'use client';

import { useState, useEffect } from 'react';
import { storageGet, storageSet } from '@/lib/storage';
import { useFavorites } from '@/contexts/FavoritesContext';
import TeamPicker from './TeamPicker';

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const { favoriteTeams, toggleTeam } = useFavorites();

  useEffect(() => {
    if (!storageGet<boolean>('onboarded', false)) {
      setShow(true);
    }
  }, []);

  function finish() {
    storageSet('onboarded', true);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center px-4 pt-4" style={{ paddingBottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))' }}>
      <div className="bg-surface-50 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl border border-surface-200" style={{ maxHeight: 'calc(100svh - 6rem - env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <svg width="36" height="36" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2" style={{ borderRadius: '10px', display: 'block' }}>
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
          <h2 className="text-base font-extrabold text-gray-900">
            Welcome to DiamondScore
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Follow teams to see their games at the top of your feed.
          </p>
        </div>

        {/* Team picker — scrolls if content overflows on small screens */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 min-h-0">
          <TeamPicker selectedTeams={favoriteTeams} onToggle={toggleTeam} />
        </div>

        {/* Actions — always visible at bottom */}
        <div className="px-5 pb-5 flex gap-2 flex-shrink-0">
          <button
            onClick={finish}
            className="flex-1 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-light transition-colors"
          >
            {favoriteTeams.size > 0 ? "Let's go!" : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
