/**
 * Date helpers.
 *
 * Every date in this app is a calendar date — "the 3rd of March" — never an instant.
 * They are stored and passed as `YYYY-MM-DD` strings and parsed at UTC midnight so a
 * traveller in New York and a server in Virginia agree on which day is which.
 */

const DAY_MS = 86_400_000;

export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Expected a YYYY-MM-DD date, got "${iso}"`);

  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls overflow forward rather than failing: month 13 becomes January of the
  // next year, and 31 February becomes 3 March. Round-tripping catches both, so a
  // malformed date is rejected instead of silently becoming a different one.
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new Error(`Not a real calendar date: "${iso}"`);
  }
  return d;
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(parseDate(iso).getTime() + days * DAY_MS));
}

export function isValidDate(iso: string): boolean {
  try {
    parseDate(iso);
    return true;
  } catch {
    return false;
  }
}

/** Nights between two dates. Arriving the 1st and leaving the 5th is 4 nights. */
export function nightsBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

/** Every calendar date from start to end inclusive. */
export function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const last = parseDate(end).getTime();
  for (let t = parseDate(start).getTime(); t <= last; t += DAY_MS) {
    out.push(toISO(new Date(t)));
  }
  if (out.length === 0) throw new Error(`Empty date range: ${start} to ${end}`);
  return out;
}

export function today(): string {
  return toISO(new Date());
}

/**
 * Days from today to `iso`, negative in the past.
 *
 * `from` overrides "today". Anything whose behaviour depends on the current date needs to
 * be testable without the test being a function of the day it runs on — forecast horizons
 * especially, where the whole point is what happens either side of a boundary.
 */
export function daysUntil(iso: string, from?: string): number {
  return Math.round((parseDate(iso).getTime() - parseDate(from ?? today()).getTime()) / DAY_MS);
}

const DAYS_IN_MONTH_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Index into a fixed 366-day leap calendar: 1 Jan = 0, 29 Feb = 59, 1 Mar = 60.
 *
 * Climate normals are stored against this calendar so that 1 March always resolves to
 * the same slot whatever the year. Shared with scripts/build-reference-data.ts, which
 * writes the arrays this indexes into — the two must never drift apart.
 */
export function leapDayIndex(month: number, day: number): number {
  if (month < 1 || month > 12) throw new Error(`Month out of range: ${month}`);
  let idx = 0;
  for (let m = 0; m < month - 1; m++) idx += DAYS_IN_MONTH_LEAP[m];
  return idx + day - 1;
}

export function leapDayIndexOf(iso: string): number {
  const d = parseDate(iso);
  return leapDayIndex(d.getUTCMonth() + 1, d.getUTCDate());
}

export function monthOf(iso: string): number {
  return parseDate(iso).getUTCMonth() + 1;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The months a date range touches, in order, deduplicated. */
export function monthsInRange(start: string, end: string): number[] {
  const seen = new Set<number>();
  for (const d of datesInRange(start, end)) seen.add(monthOf(d));
  return [...seen];
}

export function formatDate(iso: string, opts: { year?: boolean } = {}): string {
  const d = parseDate(iso);
  const base = `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return opts.year === false ? base : `${base}, ${d.getUTCFullYear()}`;
}

/** "12–19 Mar 2027", collapsing shared month and year. */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Dates not set";
  const s = parseDate(start);
  const e = parseDate(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();

  if (sameMonth) {
    return `${s.getUTCDate()}–${e.getUTCDate()} ${MONTH_ABBR[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${s.getUTCDate()} ${MONTH_ABBR[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTH_ABBR[e.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}
