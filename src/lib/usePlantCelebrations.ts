import { useEffect, useMemo } from 'react';

import { addDays, todayISO } from './dates';
import { mealsForDate } from './diet/parse';
import { buildHistory, restDaysOf } from './history';
import { celebrationFor, plantStatus, useCelebration } from './plant';
import { dayProgress, extrasOf, useDietStore, type DietState } from './store/useDietStore';
import { useToday } from './useToday';

function isComplete(state: DietState, date: string): boolean {
  if (!state.plan) return false;
  const meals = mealsForDate(state.plan, date);
  const { total, done } = dayProgress(meals, state.choices[date], state.eaten[date], extrasOf(state, date));
  return total > 0 && done === total;
}

function historyOf(state: DietState, today: string) {
  const { plan, choices, eaten, archive } = state;
  return buildHistory(plan, choices, eaten, archive, today, (d) => extrasOf(state, d));
}

/**
 * Celebrates with the plant the moment today (or yesterday, ticked late) gets
 * fully ticked off. Mounted once, in the root layout.
 */
export function usePlantCelebrations() {
  useEffect(
    () =>
      useDietStore.subscribe((state, prev) => {
        // A new plan, a restored backup or the first hydration aren't the user ticking a food.
        if (state.plan !== prev.plan || state.eaten === prev.eaten) return;
        const today = todayISO();
        for (const date of [today, addDays(today, -1)]) {
          if (state.eaten[date] === prev.eaten[date]) continue;
          if (isComplete(state, date) && !isComplete(prev, date)) {
            useCelebration
              .getState()
              .show(celebrationFor(historyOf(state, today), date, restDaysOf(state.plan)));
            return;
          }
        }
      }),
    [],
  );
}

/** How the plant is doing today, for the badge on the Oggi tab. */
export function usePlantStatus() {
  const today = useToday();
  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices);
  const eaten = useDietStore((s) => s.eaten);
  const archive = useDietStore((s) => s.archive);
  const added = useDietStore((s) => s.added);
  const qtyOverrides = useDietStore((s) => s.qtyOverrides);

  return useMemo(() => {
    const days = buildHistory(plan, choices, eaten, archive, today, (d) =>
      extrasOf({ added, qtyOverrides }, d),
    );
    const rest = restDaysOf(plan);
    const status = plantStatus(days, today, rest);
    /** Plays the last celebration again, e.g. when the badge is tapped. */
    const replay = () => {
      const last = status.doneToday ? today : addDays(today, -1);
      if (status.streak > 0 && !status.dry) {
        useCelebration.getState().show(celebrationFor(days, last, rest));
      }
    };
    return { ...status, replay };
  }, [plan, choices, eaten, archive, added, qtyOverrides, today]);
}
