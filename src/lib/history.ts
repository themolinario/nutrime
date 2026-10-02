import { addDays } from './dates';
import { plantStatus, type RestDay } from './plant';
import { mealsForDate } from './diet/parse';
import { entryLabel, entryName, mealEntries, type DayExtras } from './diet/day';
import type { SlotKey } from './diet/slots';
import type { DietPlan } from './diet/types';

export type HistoryItem = { category: string; name: string; qty: string; done: boolean };
export type HistoryMeal = { key: string; name: string; free: boolean; items: HistoryItem[] };

/**
 * A day as it was lived: what was chosen and what was ticked, with names and
 * quantities spelled out so it still reads after the plan it came from is gone.
 */
export type HistoryDay = {
  date: string;
  meals: HistoryMeal[];
  /** Foods ticked as eaten. */
  done: number;
  /** Foods chosen for the day — what there was to eat. */
  total: number;
};

type DayMap<T> = Record<string, Record<SlotKey, T>>;

/** The day resolved against a plan, or null when nothing was chosen or ticked. */
export function resolveDay(
  plan: DietPlan,
  date: string,
  choices: Record<SlotKey, string> | undefined,
  eaten: Record<SlotKey, boolean> | undefined,
  extras?: DayExtras,
): HistoryDay | null {
  let done = 0;
  let total = 0;
  const meals = mealsForDate(plan, date).map((meal) => {
    const items = mealEntries(meal, choices, eaten, extras).map((entry) => {
      total += 1;
      if (entry.done) done += 1;
      return {
        category:
          entry.kind === 'plan' ? entry.category.name : `${entryLabel(entry)}·${entry.food.id}`,
        name: entryName(entry),
        qty: entry.qty,
        done: entry.done,
      };
    });
    return { key: meal.key, name: meal.name, free: meal.free, items };
  });
  return total > 0 ? { date, meals, done, total } : null;
}

/** Every day up to `today` that has picks, resolved — what gets archived before a new plan. */
export type ExtrasFor = (date: string) => DayExtras | undefined;

export function archiveOf(
  plan: DietPlan | null,
  choices: DayMap<string>,
  eaten: DayMap<boolean>,
  today: string,
  extrasFor?: ExtrasFor,
): Record<string, HistoryDay> {
  if (!plan) return {};
  const out: Record<string, HistoryDay> = {};
  // Days with only added foods have ticks but no plan picks, so look at both.
  for (const date of new Set([...Object.keys(choices), ...Object.keys(eaten)])) {
    if (date > today) continue;
    const day = resolveDay(plan, date, choices[date], eaten[date], extrasFor?.(date));
    if (day) out[date] = day;
  }
  return out;
}

/**
 * The days to show, newest first: the current plan's days where they exist,
 * archived ones (from earlier plans) otherwise. Future days are left out.
 */
export function buildHistory(
  plan: DietPlan | null,
  choices: DayMap<string>,
  eaten: DayMap<boolean>,
  archive: Record<string, HistoryDay>,
  today: string,
  extrasFor?: ExtrasFor,
): HistoryDay[] {
  const days = new Map<string, HistoryDay>();
  for (const [date, day] of Object.entries(archive)) if (date <= today) days.set(date, day);
  for (const [date, day] of Object.entries(archiveOf(plan, choices, eaten, today, extrasFor))) {
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Days the plan leaves nothing to tick, which a streak skips over. */
export function restDaysOf(plan: DietPlan | null): RestDay {
  if (!plan) return () => false;
  return (date) => mealsForDate(plan, date).every((meal) => meal.categories.length === 0);
}

export function isComplete(day: HistoryDay | undefined): boolean {
  return !!day && day.total > 0 && day.done === day.total;
}

/**
 * Streak of fully ticked days ending today — or yesterday, since today may
 * still be in progress — plus how the last 30 days went. A single missed day
 * doesn't break the streak, two in a row do: the same rule as the plant.
 */
export function historyStats(days: HistoryDay[], today: string, rest?: RestDay) {
  const { streak } = plantStatus(days, today, rest);

  const since = addDays(today, -29);
  const recent = days.filter((d) => d.date >= since);
  const done = recent.reduce((n, d) => n + d.done, 0);
  const total = recent.reduce((n, d) => n + d.total, 0);

  return {
    streak,
    completeDays: recent.filter(isComplete).length,
    trackedDays: recent.length,
    /** Share of chosen foods actually ticked, 0–1. */
    adherence: total ? done / total : 0,
  };
}
