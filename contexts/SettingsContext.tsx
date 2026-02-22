'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { storageGet, storageSet } from '@/lib/storage';

export interface AppSettings {
  hiddenLeagues: number[];
  spoilerMode: boolean;
  theme: 'light' | 'dark';
}

const DEFAULTS: AppSettings = {
  hiddenLeagues: [],
  spoilerMode: false,
  theme: 'light',
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleLeagueVisibility: (id: number) => void;
}

const Ctx = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULTS,
    ...storageGet<Partial<AppSettings>>('settings', {}),
  }));

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      storageSet('settings', next);
      return next;
    });
  }, []);

  const toggleLeagueVisibility = useCallback((id: number) => {
    setSettings((prev) => {
      const hidden = prev.hiddenLeagues.includes(id)
        ? prev.hiddenLeagues.filter((x) => x !== id)
        : [...prev.hiddenLeagues, id];
      const next = { ...prev, hiddenLeagues: hidden };
      storageSet('settings', next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ settings, updateSettings, toggleLeagueVisibility }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
