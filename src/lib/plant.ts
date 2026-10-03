import { create } from 'zustand';

import type { IconName } from '../components/Icon';
import { addDays } from './dates';
import {
  growOf,
  SPECIES,
  speciesOf,
  type Growing,
  type SpecialShow,
  type SpeciesId,
} from './garden';
import type { HistoryDay } from './history';

/**
 * The habit plant. Every fully ticked day makes the plant being grown (see
 * garden.ts) grow, until it is ready for the greenhouse. Missing one day dries
 * it out, but completing the next one saves it; missing two days in a row
 * starts it over from a seed.
 */

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

/** Where the plant being grown stands on `today`: only the days since it was sown count. */
export function growingStatus(
  days: HistoryDay[],
  today: string,
  growing: Growing,
  rest: RestDay = () => false,
): PlantStatus & { progress: number; grow: number; ready: boolean } {
  const { days: goal } = speciesOf(growing.species);
  const status = plantStatus(daysSince(days, growing.since), today, rest);
  const progress = Math.min(status.streak, goal);
  return { ...status, progress, grow: growOf(progress, goal), ready: progress >= goal };
}

function daysSince(days: HistoryDay[], since: string): HistoryDay[] {
  return days.filter((d) => d.date >= since);
}

export type Celebration = {
  species: SpeciesId;
  /** Days grown so far, out of `goal`. */
  progress: number;
  goal: number;
  /** Growth shown at the start and at the end of the animation, 0–5. */
  from: number;
  to: number;
  /** Starts dried out and comes back to life. */
  revive: boolean;
  /** Fully grown: it glows and goes to the greenhouse. */
  grown: boolean;
  special: SpecialShow | null;
  title: string;
  subtitle: string;
  /** Shown next to the words: the app uses icons, never emoji. */
  icon: IconName;
};

/** Titles while growing, by how far the drawing has got (below 2, 3, 4, 5). */
const GROWING: [number, string, IconName][] = [
  [2, 'Spunta una fogliolina', 'plant'],
  [3, 'Cresce a vista d’occhio', 'plant'],
  [4, 'Mette nuove foglie', 'leaf'],
  [5, 'Ecco il bocciolo', 'plant'],
];

/** What to show once the day `completed` has just been ticked off, for the plant being grown. */
export function celebrationFor(
  days: HistoryDay[],
  completed: string,
  growing: Growing,
  rest: RestDay = () => false,
): Celebration {
  const species = speciesOf(growing.species);
  const goal = species.days;
  const name = species.name.toLowerCase();
  const mine = daysSince(days, growing.since);
  const progress = Math.min(plantStatus(mine, completed, rest).streak, goal);
  const byDate = new Map(mine.map((d) => [d.date, d]));
  const revive = progress > 1 && !isDone(byDate.get(previousDay(completed, rest)));
  // A fresh seed after a lost series, rather than the very first one.
  const restart = progress === 1 && mine.some((d) => d.date < completed && isDone(d));
  const grown = progress >= goal;
  const to = growOf(progress, goal);

  let title: string;
  let subtitle: string;
  let icon: IconName;
  if (grown) {
    title = species.grownTitle;
    subtitle = `${goal} giorni di fila: ${name} nella tua serra`;
    icon = species.icon;
  } else if (revive) {
    title = 'Salvata per un pelo!';
    subtitle = `La serie continua: ${progress} giorni su ${goal}`;
    icon = 'drop';
  } else if (restart) {
    title = 'Si riparte!';
    subtitle = `Nuovo seme di ${name}`;
    icon = 'leaf';
  } else if (progress === 1) {
    title = 'Seme piantato!';
    subtitle = `${species.name}: giorno 1 di ${goal}`;
    icon = 'leaf';
  } else if (progress === goal - 1) {
    title = 'Manca un giorno!';
    subtitle = `Domani ${name} va nella serra`;
    icon = 'sparkles';
  } else if (goal >= 14 && progress === Math.ceil(goal / 2)) {
    title = 'A metà strada';
    subtitle = `${progress} giorni su ${goal}, continua così`;
    icon = 'flame';
  } else {
    const [, heading, symbol] = GROWING.find(([below]) => to < below) ?? GROWING[3];
    title = heading;
    subtitle = `${progress} giorni su ${goal}`;
    icon = symbol;
  }

  return {
    species: species.id,
    progress,
    goal,
    from: growOf(progress - 1, goal),
    to,
    revive,
    grown,
    special: grown ? species.show : null,
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
  const sample = (species: SpeciesId, pattern: string) =>
    celebrationFor(series(pattern), today, { species, since: addDays(today, -90) });
  return [
    sample('girasole', 'x'),
    sample('girasole', 'xxxx'),
    sample('girasole', 'x'.repeat(11)),
    sample('girasole', 'x'.repeat(20)),
    sample('basilico', 'xxx.x'),
    sample('basilico', 'xx..x'),
    ...SPECIES.map((s) => sample(s.id, 'x'.repeat(s.days))),
  ];
}
