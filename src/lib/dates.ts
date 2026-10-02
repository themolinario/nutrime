import { WEEKDAY_LABELS } from './diet/text';

/** Local calendar day as `YYYY-MM-DD` — never UTC, so "today" matches the phone. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function weekdayOf(iso: string): number {
  const day = fromISODate(iso).getDay();
  return day === 0 ? 7 : day;
}

export function weekdayName(iso: string): string {
  return WEEKDAY_LABELS[weekdayOf(iso) - 1];
}

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

/** e.g. `12 marzo`. */
export function formatDayMonth(iso: string): string {
  const date = fromISODate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** e.g. `Settembre 2026`. */
export function formatMonthYear(iso: string): string {
  const date = fromISODate(iso);
  const month = MONTHS[date.getMonth()];
  return `${month[0].toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

/** `Oggi`, `Domani`, or the weekday name. */
export function relativeDayLabel(iso: string, reference = todayISO()): string {
  if (iso === reference) return 'Oggi';
  if (iso === addDays(reference, 1)) return 'Domani';
  if (iso === addDays(reference, -1)) return 'Ieri';
  return weekdayName(iso);
}

/** The next `count` days starting from `from`, inclusive. */
export function nextDays(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}
