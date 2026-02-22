'use client';

import { useRef, useEffect } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';

interface DateStripProps {
  selected: Date;
  onSelect: (date: Date) => void;
}

const RANGE = 7; // days before/after

export default function DateStrip({ selected, onSelect }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selected]);

  const days: Date[] = [];
  for (let i = -RANGE; i <= RANGE; i++) {
    days.push(addDays(selected, i));
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar bg-surface-100 border-b border-surface-200"
    >
      {days.map((day) => {
        const active = isSameDay(day, selected);
        const today = isToday(day);
        return (
          <button
            key={day.toISOString()}
            ref={active ? selectedRef : undefined}
            onClick={() => onSelect(day)}
            className={`flex flex-col items-center flex-shrink-0 w-12 py-1.5 rounded-lg transition-colors ${
              active
                ? 'bg-accent text-white'
                : today
                  ? 'bg-surface-50 text-accent'
                  : 'text-gray-400 hover:bg-surface-50'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {format(day, 'EEE')}
            </span>
            <span className={`text-sm font-bold ${active ? 'text-white' : ''}`}>
              {format(day, 'd')}
            </span>
            <span className="text-[9px] opacity-60">
              {format(day, 'MMM')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
