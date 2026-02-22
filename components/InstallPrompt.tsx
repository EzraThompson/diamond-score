'use client';

import { useState, useEffect } from 'react';

// Extend WindowEventMap for the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const VISIT_KEY = 'ds:visits';
const DISMISSED_KEY = 'ds:install-dismissed';
const INSTALL_THRESHOLD = 3; // show after 3rd visit

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Increment visit counter
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferred(prompt);
      if (visits >= INSTALL_THRESHOLD) {
        setVisible(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setVisible(false));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferred(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Add DiamondScore to home screen"
      className="fixed bottom-20 left-3 right-3 z-50 max-w-lg mx-auto"
    >
      <div className="bg-surface-50 border border-surface-300 rounded-2xl p-4 shadow-xl shadow-black/10 flex items-center gap-3">
        {/* Mini icon */}
        <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 44 44" width="28" height="28">
            {/* Diamond field */}
            <polygon points="22,6 38,22 22,38 6,22" fill="white" opacity="0.95" />
            <polygon
              points="22,13 29,22 22,31 15,22"
              fill="none"
              stroke="#18A34A"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">Add to Home Screen</p>
          <p className="text-xs text-gray-500 mt-0.5">Get quick access to live scores</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-lg active:opacity-75 transition-opacity"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
