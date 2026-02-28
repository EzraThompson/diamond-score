'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

type ToastKind = 'error' | 'warn' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Show a toast. Returns a function to dismiss it immediately. */
  toast: (message: string, kind?: ToastKind) => () => void;
}

// ── Context ────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ toast: () => () => {} });

let _nextId = 0;
const AUTO_DISMISS_MS = 5000;

// ── Provider ───────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'info'): (() => void) => {
    const id = _nextId++;
    setToasts((prev) => [...prev.slice(-4), { id, message, kind }]); // cap at 5
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    timers.current.set(id, timer);
    return () => dismiss(id);
  }, [dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast stack — fixed top-center on mobile */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl shadow-lg pointer-events-auto
              text-sm font-medium
              ${t.kind === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                t.kind === 'warn'  ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                                     'bg-surface-50 border border-surface-200 text-gray-700'}`}
          >
            {/* Icon */}
            <span className="mt-0.5 flex-shrink-0 text-base leading-none">
              {t.kind === 'error' ? '⚠' : t.kind === 'warn' ? '⚠' : 'ℹ'}
            </span>
            <span className="flex-1 text-xs leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 leading-none text-base"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useToast() {
  return useContext(ToastContext);
}
