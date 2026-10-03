import { useEffect, useMemo } from 'react';

import { addDays, todayISO } from './dates';
import { mealsForDate } from './diet/parse';
import { speciesOf } from './garden';
import { buildHistory, restDaysOf } from './history';
import { celebrationFor, growingStatus, useCelebration } from './plant';
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
 * Celebrates with the plant being grown the moment today (or yesterday, ticked
 * late) gets fully ticked off, and moves it to the greenhouse once grown.
 * Mounted once, in the root layout.
 */
export function usePlantCelebrations() {
  useEffect(
    () =>
      useDietStore.subscribe((state, prev) => {
        // A new plan, a restored backup or the first hydration aren't the user ticking a food.
        if (state.plan !== prev.plan || state.eaten === prev.eaten) return;
        const growing = state.garden.growing;
        if (!growing) return;
        const today = todayISO();
        for (const date of [today, addDays(today, -1)]) {
          if (date < growing.since || state.eaten[date] === prev.eaten[date]) continue;
          if (isComplete(state, date) && !isComplete(prev, date)) {
            const celebration = celebrationFor(
              historyOf(state, today),
              date,
              growing,
              restDaysOf(state.plan),
            );
            if (celebration.grown) state.harvest(date);
            useCelebration.getState().show(celebration);
            return;
          }
        }
      }),
    [],
  );
}

/** How the plant being grown is doing today, for the badge and the greenhouse. */
export function usePlantStatus() {
  const today = useToday();
  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices);
  const eaten = useDietStore((s) => s.eaten);
  const archive = useDietStore((s) => s.archive);
  const added = useDietStore((s) => s.added);
  const qtyOverrides = useDietStore((s) => s.qtyOverrides);
  const growing = useDietStore((s) => s.garden.growing);

  return useMemo(() => {
    const days = buildHistory(plan, choices, eaten, archive, today, (d) =>
      extrasOf({ added, qtyOverrides }, d),
    );
    const rest = restDaysOf(plan);
    if (!growing) return { growing: null, today, days, rest } as const;

    const species = speciesOf(growing.species);
    const status = growingStatus(days, today, growing, rest);
    /** Plays the last celebration again, e.g. when the plant is tapped. */
    const replay = () => {
      const last = status.doneToday ? today : addDays(today, -1);
      if (status.progress > 0 && !status.dry) {
        useCelebration.getState().show(celebrationFor(days, last, growing, rest));
      }
    };
    return {
      ...status,
      growing,
      species,
      /** Sown for tomorrow: today was already complete when it was picked. */
      waiting: growing.since > today,
      today,
      days,
      rest,
      replay,
    } as const;
  }, [plan, choices, eaten, archive, added, qtyOverrides, growing, today]);
}

/** Moves a plant that is already grown to the greenhouse, e.g. after a restored backup. */
export function useHarvestWhenReady(ready: boolean, today: string) {
  const harvest = useDietStore((s) => s.harvest);
  useEffect(() => {
    if (ready) harvest(today);
  }, [ready, today, harvest]);
}
