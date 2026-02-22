'use client';

import { useEffect } from 'react';

/** Enforces light mode by always removing the `dark` class from <html>. */
export default function ThemeApplier() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return null;
}
