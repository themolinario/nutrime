import { useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { track } from './analytics';
import { fromISODate, todayISO } from './dates';
import { slotKey } from './diet/slots';
import { useDietStore, useHydrated, type DietState } from './store/useDietStore';

/*
 * Everything NutriMy counts, in one place. Properties are plain facts about
 * the tap (which meal, how many days, on or off): no food names, quantities or
 * plan contents ever leave the phone this way.
 */

/** Days from today to `date`: 0 today, 1 tomorrow, -1 yesterday. */
function dayOffset(date: string): number {
  return Math.round((fromISODate(date).getTime() - fromISODate(todayISO()).getTime()) / 86_400_000);
}

type Actions = {
  [
    K in keyof DietState as DietState[K] extends (...args: never[]) => unknown ? K : never
  ]: DietState[K];
};

/**
 * Wraps a store action so each use is counted right after it happened, when
 * the state already shows the result (e.g. whether a tick is now on or off).
 */
function counted<K extends keyof Actions>(
  key: K,
  after: (...args: Parameters<Actions[K]>) => void,
) {
  const original = useDietStore.getState()[key] as (...args: Parameters<Actions[K]>) => void;
  const wrapped = (...args: Parameters<Actions[K]>) => {
    original(...args);
    after(...args);
  };
  useDietStore.setState({ [key]: wrapped } as Partial<DietState>);
}

const isEaten = (date: string, mealKey: string, categoryId: string) =>
  !!useDietStore.getState().eaten[date]?.[slotKey(mealKey, categoryId)];

let instrumented = false;

/** Hooks the counting into the store; runs once, before the first screen. */
export function instrumentStore() {
  if (instrumented) return;
  instrumented = true;

  counted('setPlan', (plan) => {
    const variants = plan.meals.flatMap((m) => m.variants);
    const tables = variants.flatMap((v) => v.categories);
    track('plan_imported', {
      meals: plan.meals.length,
      tables: tables.length,
      foods: tables.reduce((n, c) => n + c.options.length, 0),
      warnings: plan.warnings.length,
    });
  });
  counted('clearPlan', () => track('plan_deleted'));

  counted('choose', (date, mealKey) =>
    track('food_chosen', { meal: mealKey, day_offset: dayOffset(date) }),
  );
  counted('clearChoice', (date, mealKey) => track('food_unchosen', { meal: mealKey }));
  counted('toggleEaten', (date, mealKey, categoryId) =>
    track('food_eaten', {
      meal: mealKey,
      done: isEaten(date, mealKey, categoryId),
      day_offset: dayOffset(date),
      source: 'app',
    }),
  );
  // Only the widget sets ticks explicitly.
  counted('setEaten', (date, mealKey, categoryId, eaten) =>
    track('food_eaten', {
      meal: mealKey,
      done: eaten,
      day_offset: dayOffset(date),
      source: 'widget',
    }),
  );
  counted('markMealEaten', (date, mealKey) =>
    track('food_eaten', {
      meal: mealKey,
      done: true,
      day_offset: dayOffset(date),
      source: 'notification',
    }),
  );
  counted('setMealEaten', (date, mealKey, eaten) =>
    track('food_eaten', {
      meal: mealKey,
      done: eaten,
      day_offset: dayOffset(date),
      source: 'meal',
    }),
  );
  counted('clearDay', (date) => track('day_cleared', { day_offset: dayOffset(date) }));

  counted('addFood', (date, mealKey, food) =>
    track('food_added', { meal: mealKey, source: food.source }),
  );
  counted('removeFood', (date, mealKey) => track('food_removed', { meal: mealKey }));
  counted('setQtyOverride', (date, mealKey, categoryId, qty) =>
    track('qty_edited', { meal: mealKey, reset: qty === null, added_food: false }),
  );
  counted('setAddedQty', (date, mealKey) =>
    track('qty_edited', { meal: mealKey, reset: false, added_food: true }),
  );

  counted('toggleBought', (lineId) =>
    track('shopping_item_checked', { done: !!useDietStore.getState().bought[lineId] }),
  );
  counted('resetBought', () => track('shopping_reset'));
  counted('addExtra', () => track('shopping_extra_added'));
  counted('removeExtra', () => track('shopping_extra_removed'));
  counted('setHorizon', (days) => track('horizon_changed', { days }));
  counted('setHideBought', (value) => track('shopping_hide_bought', { on: value }));

  counted('setReminder', (mealKey, time) => track('reminder_set', { meal: mealKey, on: !!time }));
  counted('setRecapTime', (time) => track('recap_set', { on: !!time }));
  counted('resetTips', () => track('tips_reset'));
  counted('restoreBackup', () => track('backup_restored'));
}

/** Screen names as routes, without groups and with placeholders: `oggi`, `giorno/[date]`. */
function screenName(segments: string[]): string {
  return segments.filter((s) => !s.startsWith('(')).join('/') || 'index';
}

/** Launches and screens; mounted once in the root layout. */
export function useUsageTracking() {
  const hydrated = useHydrated();
  const consent = useDietStore((s) => s.analyticsConsent);
  const segments = useSegments();
  const screen = screenName(segments);
  const opened = useRef(false);

  useEffect(() => {
    if (!hydrated || !consent || opened.current) return;
    opened.current = true;
    const { launchCount, plan } = useDietStore.getState();
    track('app_open', { launch: launchCount, has_plan: plan !== null, resumed: false });
  }, [hydrated, consent]);

  useEffect(() => {
    if (hydrated && consent) track('screen_view', { screen });
  }, [hydrated, consent, screen]);
}
