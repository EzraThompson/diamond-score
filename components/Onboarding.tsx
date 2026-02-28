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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center px-4 pt-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-surface-50 rounded-2xl w-full max-w-sm max-h-[85svh] flex flex-col shadow-2xl border border-surface-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="text-2xl mb-1">&#9918;</div>
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
