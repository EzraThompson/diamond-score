'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  subDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

interface MonthCalendarProps {
  month: Date;
  selectedDate: Date;
  gameDays: Set<string>;
  onSelectDate: (d: Date) => void;
  onMonthChange: (d: Date) => void;
}

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MonthCalendar({
  month,
  selectedDate,
  gameDays,
  onSelectDate,
  onMonthChange,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Pad start to Sunday
  const startDow = getDay(monthStart);
  const calStart = startDow === 0 ? monthStart : subDays(monthStart, startDow);

  // Pad end to Saturday
  const endDow = getDay(monthEnd);
  const calEnd = endDow === 6 ? monthEnd : addDays(monthEnd, 6 - endDow);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div className="bg-surface-50 border-b border-surface-200 px-3 pt-2 pb-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span className="text-sm font-bold text-gray-800">
          {format(month, 'MMMM yyyy')}
        </span>

        <button
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = isSameMonth(day, month);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasGame = gameDays.has(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(day)}
                  className={`
                    relative flex flex-col items-center justify-center h-9 rounded-lg transition-colors
                    ${isSelected
                      ? 'bg-accent text-white'
                      : isTodayDate
                      ? 'ring-1 ring-accent font-bold hover:bg-accent/10'
                      : inMonth
                      ? 'hover:bg-surface-200 text-gray-700'
                      : 'text-gray-300 hover:bg-surface-100'
                    }
                  `}
                >
                  <span className={`text-xs font-semibold leading-none ${
                    isTodayDate && !isSelected ? 'text-accent' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasGame && inMonth && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isSelected ? 'bg-white/70' : 'bg-accent'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
