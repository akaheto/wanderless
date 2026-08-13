'use client';

import { useState, useEffect } from 'react';
import { isValidDate, addDays, formatDate } from '@/lib/dates';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onRangeChange }: DateRangePickerProps) {
  const [mode, setMode] = useState<'idle' | 'picking-start' | 'picking-end'>('idle');
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  // Handle direct "from" field change
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempStart(value);
    if (isValidDate(value) && isValidDate(tempEnd) && value <= tempEnd) {
      onRangeChange(value, tempEnd);
    }
  };

  // Handle direct "to" field change
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempEnd(value);
    if (isValidDate(tempStart) && isValidDate(value) && tempStart <= value) {
      onRangeChange(tempStart, value);
    }
  };

  // Handle calendar day clicks for two-click selection
  const handleDayClick = (date: string) => {
    if (mode === 'idle') {
      // First click: set start date
      setTempStart(date);
      setMode('picking-start');
    } else if (mode === 'picking-start') {
      // Second click: set end date
      if (date >= date) {
        setTempEnd(date);
        onRangeChange(date, date);
        setMode('idle');
      } else {
        // If user clicks earlier date, swap them
        setTempEnd(tempStart);
        setTempStart(date);
        onRangeChange(date, tempStart);
        setMode('idle');
      }
    }
  };

  const displayStart = isValidDate(tempStart) ? formatDate(tempStart) : 'Select start';
  const displayEnd = isValidDate(tempEnd) ? formatDate(tempEnd) : 'Select end';

  return (
    <div className="space-y-4">
      {/* Direct input fields */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-ink-3 uppercase tracking-wide">From</label>
          <input
            type="date"
            value={tempStart}
            onChange={handleFromChange}
            className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm font-medium text-ink-2"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-ink-3 uppercase tracking-wide">To</label>
          <input
            type="date"
            value={tempEnd}
            onChange={handleToChange}
            className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm font-medium text-ink-2"
          />
        </div>
      </div>

      {/* Two-click calendar hint */}
      <div className="rounded-lg bg-surface-2 p-3">
        <p className="text-xs text-ink-3 mb-3">
          💡 Or click twice on a calendar to select a range
        </p>
        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays(tempStart, tempEnd).map((day) => (
            <button
              key={day.date}
              onClick={() => handleDayClick(day.date)}
              disabled={!day.isSelectable}
              className={`
                aspect-square rounded text-xs font-medium transition-colors
                ${!day.isSelectable ? 'text-ink-4 cursor-default' : ''}
                ${day.isStart || day.isEnd ? 'bg-accent text-white' : ''}
                ${day.isInRange && !day.isStart && !day.isEnd ? 'bg-accent bg-opacity-30 text-ink-2' : ''}
                ${!day.isInRange && day.isSelectable && !(day.isStart || day.isEnd) ? 'bg-surface-1 text-ink-2 hover:bg-surface-3' : ''}
              `}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current selection display */}
      <div className="text-xs text-ink-3">
        📅 Selected: {displayStart} to {displayEnd}
      </div>
    </div>
  );
}

function generateCalendarDays(
  startDate: string,
  endDate: string,
): { date: string; label: string; isStart: boolean; isEnd: boolean; isInRange: boolean; isSelectable: boolean }[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Generate next 90 days
  const days = [];
  for (let i = 0; i < 90; i++) {
    const date = new Date(year, month, today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const label = String(date.getDate()).padStart(2, ' ');

    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const isInRange = isValidDate(startDate) && isValidDate(endDate) && dateStr >= startDate && dateStr <= endDate;

    days.push({
      date: dateStr,
      label,
      isStart,
      isEnd,
      isInRange,
      isSelectable: true,
    });
  }

  return days;
}
