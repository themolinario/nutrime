/** Lowercase, strip accents and collapse whitespace — for comparing labels. */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when every cased letter in the string is uppercase. */
export function isUpper(s: string): boolean {
  const letters = s.replace(/[^\p{L}]/gu, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
}

export const WEEKDAYS = [
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica',
] as const;

export const WEEKDAY_LABELS = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica',
] as const;

/** ISO weekday (1 = Monday) for an Italian day name, or `null`. */
export function weekdayFromName(s: string): number | null {
  const n = norm(s);
  const i = WEEKDAYS.indexOf(n as (typeof WEEKDAYS)[number]);
  return i === -1 ? null : i + 1;
}

/**
 * Read the ISO weekdays out of a day-group header.
 * Handles `TUTTA LA SETTIMANA`, `DAL LUNEDÌ AL VENERDÌ` and comma-separated lists.
 */
export function parseDays(label: string): number[] {
  const n = norm(label);
  if (/tutti i giorni|tutta la settimana|ogni giorno/.test(n)) return [1, 2, 3, 4, 5, 6, 7];

  const range = n.match(/dal?\s+(\p{L}+)\s+(?:al|a)\s+(\p{L}+)/u);
  if (range) {
    const from = weekdayFromName(range[1]);
    const to = weekdayFromName(range[2]);
    if (from && to) {
      const out: number[] = [];
      for (let d = from; d !== to; d = (d % 7) + 1) out.push(d);
      out.push(to);
      return out;
    }
  }

  const found: number[] = [];
  for (const token of n.split(/[,;/]|\se\s|\bed\b/)) {
    const d = weekdayFromName(token.trim());
    if (d && !found.includes(d)) found.push(d);
  }
  return found.sort((a, b) => a - b);
}

/** True when the line is a day-group header rather than a food category. */
export function isDayGroupLabel(s: string): boolean {
  const n = norm(s);
  if (/tutta la settimana|tutti i giorni|ogni giorno/.test(n)) return true;
  if (!isUpper(s)) return false;
  return parseDays(s).length > 0;
}

/** Human list of weekdays, e.g. "Lun, Mer, Ven". */
export function formatDays(days: number[]): string {
  if (days.length === 7) return 'Tutta la settimana';
  return days.map((d) => WEEKDAY_LABELS[d - 1].slice(0, 3)).join(', ');
}

export function slug(s: string): string {
  return norm(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
