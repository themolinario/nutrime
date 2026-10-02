import { addDays } from './dates';

export type WeightEntry = { date: string; kg: number };

/** Readings that make sense for an adult, in kg. */
export const WEIGHT_MIN = 25;
export const WEIGHT_MAX = 350;

/** Every reading, oldest first. */
export function weightEntries(weights: Record<string, number>): WeightEntry[] {
  return Object.entries(weights)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The reading on `date` or the closest one before it. */
export function weightOn(entries: WeightEntry[], date: string): WeightEntry | undefined {
  let found: WeightEntry | undefined;
  for (const entry of entries) {
    if (entry.date > date) break;
    found = entry;
  }
  return found;
}

/** `72,4`, the Italian way, to one decimal. */
export function formatKg(kg: number): string {
  return kg.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** A change with its sign: `+0,4`, `−1,2`, `0,0`. */
export function formatDelta(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  if (rounded === 0) return '0,0';
  return `${rounded > 0 ? '+' : '−'}${formatKg(Math.abs(rounded))}`;
}

/** Reads what was typed (`72,4`, `72.4`, ` 72 `) into kg, or null when it isn't a weight. */
export function parseKg(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < WEIGHT_MIN || value > WEIGHT_MAX) return null;
  return Math.round(value * 10) / 10;
}

export type WeightRange = { key: string; label: string; days: number | null };

export const WEIGHT_RANGES: WeightRange[] = [
  { key: '1m', label: '1 mese', days: 30 },
  { key: '3m', label: '3 mesi', days: 91 },
  { key: '1y', label: '1 anno', days: 365 },
  { key: 'all', label: 'Tutto', days: null },
];

/** The readings inside the range ending today. */
export function entriesInRange(
  entries: WeightEntry[],
  range: WeightRange,
  today: string,
): WeightEntry[] {
  if (range.days === null) return entries;
  const since = addDays(today, -(range.days - 1));
  return entries.filter((e) => e.date >= since && e.date <= today);
}
