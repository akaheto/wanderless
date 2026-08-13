'use client';

import { useState, useRef } from 'react';
import { isValidDate, formatDate } from '@/lib/dates';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onRangeChange }: DateRangePickerProps) {
  const [mode, setMode] = useState<'idle' | 'picking-start' | 'picking-end'>('idle');
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [showCalendar, setShowCalendar] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [startError, setStartError] = useState('');
  const [endError, setEndError] = useState('');
  const [focusedDateIndex, setFocusedDateIndex] = useState<number | null>(null);
  const calendarButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Handle direct "from" field change
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempStart(value);
    setStartError('');

    if (value === '') {
      setStartError('');
      return;
    }

    if (!isValidDate(value)) {
      setStartError('Invalid date format');
      return;
    }

    if (isValidDate(tempEnd) && value > tempEnd) {
      setStartError('Start date must be before end date');
      return;
    }

    if (isValidDate(value) && isValidDate(tempEnd)) {
      onRangeChange(value, tempEnd);
      setAnnouncement(`Start date changed to ${formatDate(value)}`);
    }
  };

  // Handle direct "to" field change
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempEnd(value);
    setEndError('');

    if (value === '') {
      setEndError('');
      return;
    }

    if (!isValidDate(value)) {
      setEndError('Invalid date format');
      return;
    }

    if (isValidDate(tempStart) && value < tempStart) {
      setEndError('End date must be after start date');
      return;
    }

    if (isValidDate(tempStart) && isValidDate(value)) {
      onRangeChange(tempStart, value);
      setAnnouncement(`End date changed to ${formatDate(value)}`);
    }
  };

  // Handle calendar day clicks for two-click selection
  const handleDayClick = (date: string) => {
    if (mode === 'idle') {
      // First click: set start date
      setTempStart(date);
      setMode('picking-start');
      setAnnouncement(`Start date selected: ${formatDate(date)}. Click another date to set the end date.`);
    } else if (mode === 'picking-start') {
      // Second click: set end date
      if (date >= tempStart) {
        setTempEnd(date);
        onRangeChange(tempStart, date);
        setMode('idle');
        setAnnouncement(`Range selected: ${formatDate(tempStart)} to ${formatDate(date)}`);
      } else {
        // If user clicks earlier date, swap them
        setTempEnd(tempStart);
        setTempStart(date);
        onRangeChange(date, tempStart);
        setMode('idle');
        setAnnouncement(`Range selected: ${formatDate(date)} to ${formatDate(tempStart)}`);
      }
    }
  };

  // Handle keyboard navigation in calendar
  const handleCalendarKeyDown = (e: React.KeyboardEvent, index: number) => {
    const daysPerWeek = 7;
    let newIndex = index;

    if (e.key === 'ArrowRight') {
      newIndex = index + 1;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      newIndex = index - 1;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      newIndex = index + daysPerWeek;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      newIndex = index - daysPerWeek;
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      calendarButtonsRef.current[index]?.click();
      return;
    }

    if (newIndex >= 0 && newIndex < calendarButtonsRef.current.length) {
      setFocusedDateIndex(newIndex);
      calendarButtonsRef.current[newIndex]?.focus();
    }
  };

  const displayStart = isValidDate(tempStart) ? formatDate(tempStart) : 'Select start';
  const displayEnd = isValidDate(tempEnd) ? formatDate(tempEnd) : 'Select end';

  return (
    <div className="space-y-4">
      {/* Announcement region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Direct input fields - stack on mobile, flex on desktop */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="date-from" className="block text-xs text-ink-3 uppercase tracking-wide mb-1">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={tempStart}
            onChange={handleFromChange}
            aria-invalid={startError ? 'true' : 'false'}
            aria-describedby={startError ? 'date-from-error' : undefined}
            className={`w-full rounded-lg border bg-surface-1 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
              startError ? 'border-critical text-critical focus-visible:outline-critical' : 'border-line text-ink-2 focus-visible:outline-accent'
            }`}
            aria-label="Start date"
          />
          {startError && (
            <p id="date-from-error" className="mt-1 text-xs text-critical font-medium">
              {startError}
            </p>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="date-to" className="block text-xs text-ink-3 uppercase tracking-wide mb-1">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={tempEnd}
            onChange={handleToChange}
            aria-invalid={endError ? 'true' : 'false'}
            aria-describedby={endError ? 'date-to-error' : undefined}
            className={`w-full rounded-lg border bg-surface-1 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
              endError ? 'border-critical text-critical focus-visible:outline-critical' : 'border-line text-ink-2 focus-visible:outline-accent'
            }`}
            aria-label="End date"
          />
          {endError && (
            <p id="date-to-error" className="mt-1 text-xs text-critical font-medium">
              {endError}
            </p>
          )}
        </div>
      </div>

      {/* Toggle calendar button on mobile, always show on desktop via CSS */}
      <div className="sm:hidden">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors"
          aria-expanded={showCalendar}
          aria-controls="calendar-picker"
        >
          {showCalendar ? 'Hide calendar' : 'Show calendar'}
        </button>
      </div>

      {/* Two-click calendar - always visible on desktop (sm+), toggled on mobile */}
      <div
        id="calendar-picker"
        className={`rounded-lg bg-surface-2 p-3 sm:block ${showCalendar ? 'block' : 'hidden'}`}
      >
        <p className="text-xs text-ink-2 mb-4">
          Click twice to select a range, or use arrow keys to navigate
        </p>

        {/* Calendar with month headers */}
        <div className="space-y-4">
          {groupCalendarByMonth(generateCalendarDays(tempStart, tempEnd)).map(
            (monthGroup) => (
              <div key={monthGroup.month}>
                {/* Month header */}
                <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 px-1">
                  {monthGroup.month}
                </h3>

                {/* Week rows */}
                <div className="space-y-1">
                  {groupDaysIntoWeeks(monthGroup.days).map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-1">
                      {week.map((day, dayIdx) => (
                        <button
                          key={day?.date ?? `empty-${dayIdx}`}
                          ref={(el) => {
                            const index = generateCalendarDays(tempStart, tempEnd).findIndex(
                              (d) => d.date === day?.date
                            );
                            if (index >= 0) calendarButtonsRef.current[index] = el;
                          }}
                          onClick={() => day && handleDayClick(day.date)}
                          onKeyDown={(e) => {
                            const index = generateCalendarDays(tempStart, tempEnd).findIndex(
                              (d) => d.date === day?.date
                            );
                            if (index >= 0) handleCalendarKeyDown(e, index);
                          }}
                          disabled={!day || !day.isSelectable}
                          tabIndex={focusedDateIndex === null ? -1 : 0}
                          aria-label={
                            day
                              ? `${formatDate(day.date)}${day.isStart ? ', start date' : ''}${day.isEnd ? ', end date' : ''}${day.isInRange ? ', in range' : ''}`
                              : undefined
                          }
                          className={`
                            aspect-square rounded text-xs font-medium transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-accent
                            ${
                              !day || !day.isSelectable
                                ? 'cursor-default opacity-30'
                                : 'cursor-pointer'
                            }
                            ${
                              day?.isStart || day?.isEnd
                                ? 'bg-accent text-white font-bold shadow-md'
                                : ''
                            }
                            ${
                              day?.isInRange && !day?.isStart && !day?.isEnd
                                ? 'bg-accent bg-opacity-70 text-ink-2 border border-accent border-opacity-50'
                                : ''
                            }
                            ${
                              day &&
                              !day.isInRange &&
                              day.isSelectable &&
                              !day.isStart &&
                              !day.isEnd
                                ? 'bg-surface-1 text-ink-2 hover:bg-surface-3'
                                : ''
                            }
                          `}
                        >
                          {day?.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Current selection display */}
      <div className="text-xs text-ink-2 font-medium">
        Selected: {displayStart} to {displayEnd}
      </div>
    </div>
  );
}

function generateCalendarDays(startDate: string, endDate: string): CalendarDay[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Generate next 380 days (~1 year) to support planning trips far in advance
  const days = [];
  for (let i = 0; i < 380; i++) {
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

function groupCalendarByMonth(days: CalendarDay[]): Array<{ month: string; days: CalendarDay[] }> {
  const monthMap = new Map<string, CalendarDay[]>();

  days.forEach((day) => {
    const date = new Date(day.date);
    const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push(day);
  });

  return Array.from(monthMap.entries()).map(([month, daysInMonth]) => ({
    month,
    days: daysInMonth,
  }));
}

interface CalendarDay {
  date: string;
  label: string;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isSelectable: boolean;
}

type CalendarWeek = (CalendarDay | null)[];

function groupDaysIntoWeeks(days: CalendarDay[]): CalendarWeek[] {
  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarWeek = [];

  // Get the day of week for the first day
  if (days.length > 0) {
    const firstDate = new Date(days[0].date);
    const startDayOfWeek = firstDate.getDay();

    // Add empty slots for days before the first date
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }
  }

  days.forEach((day, index) => {
    currentWeek.push(day);

    // Start a new week on Saturday (after 7 days including padding)
    if ((currentWeek.length - 1) % 7 === 6 || index === days.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return weeks;
}
