import { create } from 'zustand';

import type { IconName } from '../components/Icon';
import { addDays } from './dates';
import type { HistoryDay } from './history';

/**
 * The habit plant. Every fully ticked day makes it grow, up to a flower on the
 * fifth day in a row; from then on it lights up every day, with a special show
 * every five days. Missing one day dries it out, but completing the next one
 * saves it; missing two days in a row starts over from a seed.
 */

/** The plant is fully grown from this many days in a row. */
export const FULL_GROWN = 5;

export type PlantStatus = {
  /** Complete days in the current series, one missed day in between allowed. */
  streak: number;
  /** Yesterday was missed: completing today saves the series. */
  dry: boolean;
  doneToday: boolean;
};

function isDone(day: HistoryDay | undefined): boolean {
  return !!day && day.total > 0 && day.done === day.total;
}

/** Days the plan leaves nothing to tick (a rest day, only free meals): they neither count nor break the series. */
export type RestDay = (date: string) => boolean;

/** How far back a series is followed, so a plan of rest days alone can't loop forever. */
const LOOKBACK_DAYS = 3 * 365;

/** The last day before `date` that wasn't a rest day. */
function previousDay(date: string, rest: RestDay): string {
  let cursor = addDays(date, -1);
  for (let i = 0; i < LOOKBACK_DAYS && rest(cursor); i++) cursor = addDays(cursor, -1);
  return cursor;
}

/** Where the series stands on `today`, from the resolved days of the history. */
export function plantStatus(
  days: HistoryDay[],
  today: string,
  rest: RestDay = () => false,
): PlantStatus {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const done = (date: string) => isDone(byDate.get(date));

  // Today still in progress is not a miss yet.
  const doneToday = done(today);
  let cursor = doneToday ? today : addDays(today, -1);
  let streak = 0;
  let missedInRow = 0;
  for (let i = 0; i < LOOKBACK_DAYS && missedInRow < 2; i++) {
    if (done(cursor)) {
      streak += 1;
      missedInRow = 0;
    } else if (!rest(cursor)) {
      missedInRow += 1;
    }
    cursor = addDays(cursor, -1);
  }

  const dry = streak > 0 && !doneToday && !done(previousDay(today, rest));
  return { streak, dry, doneToday };
}

/** Growth from 0 (bare soil) to {@link FULL_GROWN} (in flower). */
export function stageOf(streak: number): number {
  return Math.min(streak, FULL_GROWN);
}

export type SpecialShow = 'butterflies' | 'fruits' | 'rainbow' | 'stars';
const SPECIALS: SpecialShow[] = ['butterflies', 'fruits', 'rainbow', 'stars'];

export type Celebration = {
  streak: number;
  /** Growth shown at the start and at the end of the animation. */
  from: number;
  to: number;
  /** Starts dried out and comes back to life. */
  revive: boolean;
  /** Fully grown and glowing. */
  lit: boolean;
  special: SpecialShow | null;
  title: string;
  subtitle: string;
  /** Shown next to the words: the app uses icons, never emoji. */
  icon: IconName;
};

const GROWING: Record<number, [string, string, IconName]> = {
  1: ['Seme piantato!', 'Prima giornata completa', 'leaf'],
  2: ['Spunta una fogliolina', '2 giorni di fila, niente male', 'plant'],
  3: ['Cresce a vista d’occhio', '3 giorni di fila, forza così', 'plant'],
  4: ['Ecco il bocciolo', '4 giorni: quasi in fiore', 'plant'],
  5: ['È fiorita!', '5 giorni di fila, che costanza', 'flower'],
};

const LIT_TITLES = ['Si accende!', 'Brilla di salute', 'Luce piena', 'Più radiosa che mai'];
const LIT_QUIPS = [
  'la costanza ti dona',
  'abitudine sbloccata',
  'il tuo piano ringrazia',
  'energia pura',
  'nessuno ti ferma',
];

const SPECIAL_TEXT: Record<SpecialShow, [string, (n: number) => string, IconName]> = {
  butterflies: ['Arrivano le farfalle', (n) => `${n} giorni: che giardino!`, 'butterfly'],
  fruits: ['Frutti maturi!', (n) => `${n} giorni: raccogli i risultati`, 'cherries'],
  rainbow: ['Arcobaleno!', (n) => `${n} giorni senza mollare`, 'rainbow'],
  stars: ['Pioggia di stelle', (n) => `${n} giorni: sei leggenda`, 'shooting-star'],
};

/** What to show once the day `completed` has just been ticked off. */
export function celebrationFor(
  days: HistoryDay[],
  completed: string,
  rest: RestDay = () => false,
): Celebration {
  const { streak } = plantStatus(days, completed, rest);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const revive = streak > 1 && !isDone(byDate.get(previousDay(completed, rest)));
  // A fresh seed after a lost series, rather than the very first one.
  const restart = streak === 1 && days.some((d) => d.date < completed && isDone(d));

  const lit = streak > FULL_GROWN;
  const special =
    lit && streak % FULL_GROWN === 0 ? SPECIALS[(streak / FULL_GROWN - 2) % SPECIALS.length] : null;

  let title: string;
  let subtitle: string;
  let icon: IconName;
  if (revive) {
    title = 'Salvata per un pelo!';
    subtitle = `La serie continua: ${streak} giorni`;
    icon = 'drop';
  } else if (restart) {
    title = 'Si riparte!';
    subtitle = 'Nuovo seme, nuova serie';
    icon = 'leaf';
  } else if (special) {
    const [heading, line, symbol] = SPECIAL_TEXT[special];
    title = heading;
    subtitle = line(streak);
    icon = symbol;
  } else if (lit) {
    title = LIT_TITLES[streak % LIT_TITLES.length];
    subtitle = `${streak} giorni di fila: ${LIT_QUIPS[streak % LIT_QUIPS.length]}`;
    icon = 'sparkles';
  } else {
    [title, subtitle, icon] = GROWING[streak] ?? GROWING[1];
  }

  return {
    streak,
    from: stageOf(streak - 1),
    to: stageOf(streak),
    revive,
    lit,
    special,
    title,
    subtitle,
    icon,
  };
}

/** The celebration on screen, if any. Not persisted: it only lives for a few seconds. */
export const useCelebration = create<{
  current: Celebration | null;
  /** Bumped by every show, so a new one restarts the animation. */
  seq: number;
  show: (celebration: Celebration) => void;
  hide: () => void;
}>()((set) => ({
  current: null,
  seq: 0,
  show: (current) => set((s) => ({ current, seq: s.seq + 1 })),
  hide: () => set({ current: null }),
}));

/**
 * Every kind of celebration, built from made-up histories: in development a
 * long press on the plant badge plays them one after the other.
 */
export function sampleCelebrations(today: string): Celebration[] {
  const series = (pattern: string) =>
    [...pattern].map((c, i) => ({
      date: addDays(today, i - pattern.length + 1),
      meals: [],
      done: c === 'x' ? 1 : 0,
      total: 1,
    }));
  const full = (n: number) => 'x'.repeat(n);
  return ['x', 'xx', 'xxx', 'xxxx', 'xxxxx', full(6), full(10), full(15), full(20), full(25), 'xxx.x', 'xx..x'].map(
    (pattern) => celebrationFor(series(pattern), today),
  );
}
