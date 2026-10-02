import { addDays, fromISODate } from '../dates';
import { mealsForDate } from '../diet/parse';
import { mealEntries, entryName, type DayExtras } from '../diet/day';
import type { SlotKey } from '../diet/slots';
import type { DietPlan } from '../diet/types';
import type { TodayWidgetProps, WidgetItem } from './types';

/** How many days ahead the widget can roll over on its own at midnight. */
export const WIDGET_DAYS = 7;

/** The chosen and added foods of one day, in meal order. Unchosen slots are left out. */
export function widgetItems(
  plan: DietPlan,
  date: string,
  choices: Record<SlotKey, string> | undefined,
  eaten: Record<SlotKey, boolean> | undefined,
  extras?: DayExtras,
): WidgetItem[] {
  return mealsForDate(plan, date).flatMap((meal) =>
    mealEntries(meal, choices, eaten, extras).map((entry) => ({
      mealKey: meal.key,
      // Added foods tick through the same slot space, under their `+id`.
      categoryId: entry.kind === 'plan' ? entry.category.id : `+${entry.food.id}`,
      meal: meal.name,
      name: entryName(entry),
      qty: entry.qty,
      done: entry.done,
    })),
  );
}

/**
 * One entry for today, shown now, and one per following day starting at its
 * midnight — so the widget moves on to tomorrow's menu without the app running.
 */
export function buildWidgetTimeline(
  plan: DietPlan | null,
  choices: Record<string, Record<SlotKey, string>>,
  eaten: Record<string, Record<SlotKey, boolean>>,
  today: string,
  now = new Date(),
  extrasFor?: (date: string) => DayExtras | undefined,
): { date: Date; props: TodayWidgetProps }[] {
  return Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return {
      date: i === 0 ? now : fromISODate(date),
      props: {
        date,
        items: plan ? widgetItems(plan, date, choices[date], eaten[date], extrasFor?.(date)) : [],
        pending: [],
      },
    };
  });
}
