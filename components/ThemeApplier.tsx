'use client';

import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

/** Applies/removes the `dark` class on <html> based on settings.theme. */
export default function ThemeApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  return null;
}
