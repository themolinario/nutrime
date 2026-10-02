import { addDays, fromISODate } from '../dates';
import { mealsForDate } from '../diet/parse';
import { entryName, mealEntries, type DayExtras } from '../diet/day';
import type { SlotKey } from '../diet/slots';
import type { DietPlan } from '../diet/types';

/** How many days of reminders are kept scheduled; iOS allows 64 pending in total. */
export const REMINDER_DAYS = 7;

export type ReminderData = {
  date: string;
  mealKey?: string;
  kind: 'meal' | 'recap';
};

export type ReminderRequest = {
  id: string;
  at: Date;
  title: string;
  body: string;
  data: ReminderData;
};

/** `HH:MM` → minutes after midnight, or null when malformed. */
export function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/* ── Copy ────────────────────────────────────────────────────────────────── */

const TITLES: Record<string, string[]> = {
  colazione: [
    '☀️ Buongiorno! La colazione ti aspetta',
    '☕ Si parte: è ora della colazione',
    '🥣 Carica le energie, colazione!',
    '🌞 Nuovo giorno, nuova colazione',
  ],
  'meta-mattina': [
    '🍎 Spuntino time!',
    '🍏 Una pausa a metà mattina?',
    '⏰ Piccola pausa, piccolo spuntino',
  ],
  pranzo: [
    '🍝 A tavola! È ora di pranzo',
    '🍽️ Pausa pranzo meritata',
    '🥗 Ricarica di metà giornata: pranzo!',
    '😋 Il pranzo è servito',
  ],
  merenda: [
    '🥛 Merenda o non merenda? Merenda!',
    '🍌 Pausa merenda in arrivo',
    '⏰ È l’ora della merenda',
  ],
  cena: [
    '🌙 La cena è servita',
    '🍽️ Ultimo round: la cena!',
    '✨ Chiudi la giornata in bellezza',
    '🥘 Si cena!',
  ],
  'dopo-cena': ['🌙 Ultimo spuntino della giornata'],
};
TITLES.spuntino = TITLES['meta-mattina'];
TITLES['meta-pomeriggio'] = TITLES.merenda;
TITLES['spuntino-serale'] = TITLES['dopo-cena'];

const SIGN_OFFS = [
  'Buon appetito! 😋',
  'Goditelo! 😋',
  'Poi segnalo con un tocco ✅',
  'Buon appetito!',
];

const RECAP_TITLES = [
  '🌙 Com’è andata oggi?',
  '📝 Due secondi per il tuo diario?',
  '✅ Hai spuntato tutto?',
];

/** Stable pick: the same day and meal always get the same line, days vary. */
function pick<T>(options: T[], seed: string): T {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return options[Math.abs(hash) % options.length];
}

/** `g 120` reads better as `120 g` in a sentence; other units stay as printed. */
function quantity(raw: string): string {
  const match = /^(g|kg|ml|l|cl)\s+(\d+(?:[.,]\d+)?)$/i.exec(raw.trim());
  return match ? `${match[2]} ${match[1]}` : raw;
}

/** `a, b e c` */
function list(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function mealTitle(mealKey: string, mealName: string, seed: string): string {
  const pool = TITLES[mealKey];
  return pool ? pick(pool, seed) : `🍽️ È ora: ${mealName.toLowerCase()}`;
}

/* ── Scheduling ──────────────────────────────────────────────────────────── */

type Options = {
  /** Evening check-in time, `HH:MM`, or null when off. */
  recapTime?: string | null;
  /** Current streak of fully ticked days, for the evening nudge. */
  streak?: number;
  /** Foods added and quantities edited, per date. */
  extrasFor?: (date: string) => DayExtras | undefined;
};

/**
 * One reminder per meal with a time set, for each of the next days, plus the
 * optional evening check-in. Each carries that day's actual picks, so the set is
 * rebuilt whenever choices change — which is why these are one-off dated
 * notifications rather than a daily repeat. Meals already fully ticked and times
 * already past are skipped.
 */
export function buildReminders(
  plan: DietPlan | null,
  reminders: Record<string, string>,
  choices: Record<string, Record<SlotKey, string>>,
  eaten: Record<string, Record<SlotKey, boolean>>,
  today: string,
  now = new Date(),
  { recapTime = null, streak = 0, extrasFor }: Options = {},
): ReminderRequest[] {
  if (!plan) return [];
  const requests: ReminderRequest[] = [];
  const at = (date: string, time: { hour: number; minute: number }) => {
    const when = fromISODate(date);
    when.setHours(time.hour, time.minute, 0, 0);
    return when;
  };

  for (let i = 0; i < REMINDER_DAYS; i++) {
    const date = addDays(today, i);
    const meals = mealsForDate(plan, date);
    let dayDone = 0;
    let dayTotal = 0;

    for (const meal of meals) {
      const picks = mealEntries(meal, choices[date], eaten[date], extrasFor?.(date)).map(
        (entry) => ({
          label: `${entryName(entry).toLowerCase()} ${quantity(entry.qty)}`,
          done: entry.done,
        }),
      );
      dayTotal += picks.length;
      dayDone += picks.filter((p) => p.done).length;

      const time = reminders[meal.key] ? parseTime(reminders[meal.key]) : null;
      if (!time || at(date, time) <= now) continue;
      if (picks.length && picks.every((p) => p.done)) continue;

      const seed = `${date}/${meal.key}`;
      let title = mealTitle(meal.key, meal.name, seed);
      let body: string;
      if (meal.free && !picks.length) {
        title = '🎉 Pasto libero!';
        body = `A ${meal.name.toLowerCase()} oggi decidi tu. Goditelo, con giudizio 😉`;
      } else if (!picks.length) {
        title = `🤔 ${meal.name}: cosa si mangia?`;
        body = 'Non hai ancora scelto il menu: bastano 10 secondi, dai! 👉';
      } else {
        body = `Oggi c’è: ${list(picks.map((p) => p.label))}. ${pick(SIGN_OFFS, seed)}`;
      }

      requests.push({
        id: `meal-${date}-${meal.key}`,
        at: at(date, time),
        title,
        body,
        data: { date, mealKey: meal.key, kind: 'meal' },
      });
    }

    const recap = recapTime ? parseTime(recapTime) : null;
    if (recap && at(date, recap) > now && dayTotal > 0 && dayDone < dayTotal) {
      const nextStreak = i === 0 ? streak + 1 : 0;
      const body =
        i === 0
          ? `Hai spuntato ${dayDone} su ${dayTotal}. Segna il resto e ${
              nextStreak > 1
                ? `porta la serie a ${nextStreak} giorni 🔥`
                : 'accendi una nuova serie 🔥'
            }`
          : 'Segna quello che hai mangiato oggi: la tua serie ti ringrazia 🔥';
      requests.push({
        id: `recap-${date}`,
        at: at(date, recap),
        title: pick(RECAP_TITLES, date),
        body,
        data: { date, kind: 'recap' },
      });
    }
  }
  return requests;
}
