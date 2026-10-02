import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addDays, todayISO } from '../dates';
import { mealsForDate } from '../diet/parse';
import { addedCategoryId, mealEntries, type AddedFood, type DayExtras } from '../diet/day';
import { slotKey, type SlotKey } from '../diet/slots';
import type { DietPlan, FoodCategory, ResolvedMeal } from '../diet/types';
import { EMPTY_GARDEN, type Garden, type SpeciesId } from '../garden';
import { archiveOf, type HistoryDay } from '../history';

export { slotKey, type SlotKey };

export type ExtraItem = { id: string; name: string; qty: string };

export type DietState = {
  plan: DietPlan | null;
  /** date → slot → chosen option id. */
  choices: Record<string, Record<SlotKey, string>>;
  /** date → slot → eaten. */
  eaten: Record<string, Record<SlotKey, boolean>>;
  /** Shopping-list lines already in the basket, keyed by line id. */
  bought: Record<string, boolean>;
  /** Manually added shopping-list lines. */
  extras: ExtraItem[];
  /** How many days the shopping list and the week view cover. */
  horizon: number;
  /** True once the three-step introduction has been seen. */
  onboarded: boolean;
  /** mealKey → reminder time `HH:MM`; meals without a reminder are absent. */
  reminders: Record<string, string>;
  /** date → mealKey → foods added by hand that day. */
  added: Record<string, Record<string, AddedFood[]>>;
  /** date → slot → quantity edited for that day. */
  qtyOverrides: Record<string, Record<SlotKey, string>>;
  /** date → slots the user emptied on purpose, so single-option tables stay empty. */
  declined: Record<string, Record<SlotKey, true>>;
  /** Evening check-in time `HH:MM`, or null when off. */
  recapTime: string | null;
  /** Past days of earlier plans, resolved, so the history survives a new import. */
  archive: Record<string, HistoryDay>;
  /** date → body weight in kg, one reading per day. Independent of the plan. */
  weights: Record<string, number>;
  /** The plant being grown and the ones already in the greenhouse. */
  garden: Garden;

  /* Device-only state below: never part of the cloud backup. */
  /** Cold starts so far, for the every-Nth-launch developer banner. */
  launchCount: number;
  /** Remote `developer_promo` switch as last read; null until first read. */
  promoRemote: boolean | null;
  /** True once the sign-in screen has been offered after the introduction. */
  authPrompted: boolean;
  /** When the cloud backup last succeeded, epoch ms. */
  lastBackupAt: number | null;
  /** Shopping list shows (and exports) only what is still to buy. */
  hideBought: boolean;
  /** Tooltips already shown once, by id. */
  seenTips: Record<string, true>;
  /** True once the greenhouse has been introduced on this phone. */
  gardenIntroSeen: boolean;
  /** Anonymous usage statistics: null until asked, then the user's answer. */
  analyticsConsent: boolean | null;
  /** Random id for the statistics, made when the user says yes; never tied to the account. */
  installId: string | null;

  setPlan: (plan: DietPlan) => void;
  clearPlan: () => void;
  choose: (date: string, mealKey: string, categoryId: string, optionId: string) => void;
  clearChoice: (date: string, mealKey: string, categoryId: string) => void;
  toggleEaten: (date: string, mealKey: string, categoryId: string) => void;
  /** Sets eaten state explicitly — idempotent, unlike `toggleEaten`. */
  setEaten: (date: string, mealKey: string, categoryId: string, eaten: boolean) => void;
  addFood: (date: string, mealKey: string, food: Omit<AddedFood, 'id'>) => void;
  removeFood: (date: string, mealKey: string, foodId: string) => void;
  setAddedQty: (date: string, mealKey: string, foodId: string, qty: string) => void;
  /** Edits the quantity of a plan food for one day; null restores the plan's. */
  setQtyOverride: (date: string, mealKey: string, categoryId: string, qty: string | null) => void;
  /** Ticks every chosen food of a meal, e.g. from a reminder's action. */
  markMealEaten: (date: string, mealKey: string) => void;
  /** Ticks or unticks every chosen food of a meal at once, from its card. */
  setMealEaten: (date: string, mealKey: string, eaten: boolean) => void;
  autoFill: (dates: string[], options?: { overwrite?: boolean }) => void;
  /** Picks the only food of tables that offer just one, unless the user emptied them. */
  fillSingleOptions: (dates: string[]) => void;
  clearDay: (date: string) => void;
  toggleBought: (lineId: string) => void;
  resetBought: () => void;
  addExtra: (name: string, qty: string) => void;
  removeExtra: (id: string) => void;
  setHorizon: (days: number) => void;
  /** In plans that rotate over weeks, makes the current week the given one (1-based). */
  setCycleWeek: (week: number) => void;
  setHideBought: (value: boolean) => void;
  markTipSeen: (id: string) => void;
  setGardenIntroSeen: () => void;
  /** Brings every tooltip back, e.g. from "Rivedi i suggerimenti". */
  resetTips: () => void;
  setAnalyticsConsent: (value: boolean, installId?: string) => void;
  setOnboarded: (value: boolean) => void;
  setReminder: (mealKey: string, time: string | null) => void;
  setRecapTime: (time: string | null) => void;
  registerLaunch: () => void;
  setPromoRemote: (value: boolean) => void;
  setAuthPrompted: (value: boolean) => void;
  setLastBackupAt: (value: number | null) => void;
  /** Records the day's weight in kg; null removes the reading. */
  setWeight: (date: string, kg: number | null) => void;
  /** Starts growing `species`, counting complete days from `since`; any plant growing is lost. */
  sow: (species: SpeciesId, since: string) => void;
  /** Gives up the plant being grown, and the days spent on it. */
  uproot: () => void;
  /** Moves the plant being grown, now fully grown, to the greenhouse. */
  harvest: (on: string) => void;
  /** Replaces the user's data with a cloud snapshot. */
  restoreBackup: (data: BackupData) => void;
};

/** The part of the state that is the user's data, as saved to the cloud. */
export type BackupData = Pick<
  DietState,
  | 'plan'
  | 'choices'
  | 'eaten'
  | 'bought'
  | 'extras'
  | 'horizon'
  | 'onboarded'
  | 'reminders'
  | 'recapTime'
  | 'archive'
  | 'added'
  | 'qtyOverrides'
  | 'declined'
  | 'weights'
  | 'garden'
>;

export function backupOf(state: BackupData): BackupData {
  return {
    plan: state.plan,
    choices: state.choices,
    eaten: state.eaten,
    bought: state.bought,
    extras: state.extras,
    horizon: state.horizon,
    onboarded: state.onboarded,
    reminders: state.reminders,
    recapTime: state.recapTime,
    archive: state.archive,
    added: state.added,
    qtyOverrides: state.qtyOverrides,
    declined: state.declined,
    weights: state.weights,
    garden: state.garden,
  };
}

/**
 * Picks an option the plan allows while spreading choices out: options used less
 * often across the week win, and ties are broken by position so the result is
 * stable rather than random.
 */
function pickVaried(category: FoodCategory, usage: Map<string, number>): string {
  let best = category.options[0];
  let bestScore = Infinity;
  category.options.forEach((option, index) => {
    const score = (usage.get(option.name) ?? 0) * 100 + index;
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  });
  return best.id;
}

export const useDietStore = create<DietState>()(
  persist(
    (set) => ({
      plan: null,
      choices: {},
      eaten: {},
      bought: {},
      extras: [],
      horizon: 7,
      onboarded: false,
      reminders: {},
      recapTime: null,
      archive: {},
      added: {},
      qtyOverrides: {},
      declined: {},
      weights: {},
      garden: EMPTY_GARDEN,
      launchCount: 0,
      promoRemote: null,
      authPrompted: false,
      lastBackupAt: null,
      hideBought: false,
      seenTips: {},
      gardenIntroSeen: false,
      analyticsConsent: null,
      installId: null,

      // The days lived on the old plan move to the archive before its picks go.
      setPlan: (plan) =>
        set((state) => ({
          plan,
          choices: {},
          eaten: {},
          declined: {},
          bought: {},
          extras: [],
          archive: {
            ...state.archive,
            ...archiveOf(state.plan, state.choices, state.eaten, todayISO(), (d) =>
              extrasOf(state, d),
            ),
          },
        })),

      clearPlan: () =>
        set((state) => ({
          plan: null,
          choices: {},
          eaten: {},
          declined: {},
          bought: {},
          extras: [],
          horizon: 7,
          archive: {
            ...state.archive,
            ...archiveOf(state.plan, state.choices, state.eaten, todayISO(), (d) =>
              extrasOf(state, d),
            ),
          },
        })),

      // A different food brings back the plan's quantity for it.
      choose: (date, mealKey, categoryId, optionId) =>
        set((state) => {
          const key = slotKey(mealKey, categoryId);
          const overrides = { ...state.qtyOverrides[date] };
          if (state.choices[date]?.[key] !== optionId) delete overrides[key];
          const declined = { ...state.declined[date] };
          delete declined[key];
          return {
            choices: { ...state.choices, [date]: { ...state.choices[date], [key]: optionId } },
            qtyOverrides: { ...state.qtyOverrides, [date]: overrides },
            declined: { ...state.declined, [date]: declined },
          };
        }),

      clearChoice: (date, mealKey, categoryId) =>
        set((state) => {
          const key = slotKey(mealKey, categoryId);
          const day = { ...state.choices[date] };
          delete day[key];
          const eatenDay = { ...state.eaten[date] };
          delete eatenDay[key];
          const overrides = { ...state.qtyOverrides[date] };
          delete overrides[key];
          return {
            choices: { ...state.choices, [date]: day },
            eaten: { ...state.eaten, [date]: eatenDay },
            qtyOverrides: { ...state.qtyOverrides, [date]: overrides },
            declined: { ...state.declined, [date]: { ...state.declined[date], [key]: true } },
          };
        }),

      toggleEaten: (date, mealKey, categoryId) =>
        set((state) => {
          const key = slotKey(mealKey, categoryId);
          const day = { ...state.eaten[date] };
          if (day[key]) delete day[key];
          else day[key] = true;
          return { eaten: { ...state.eaten, [date]: day } };
        }),

      setEaten: (date, mealKey, categoryId, eaten) =>
        set((state) => {
          const key = slotKey(mealKey, categoryId);
          const day = { ...state.eaten[date] };
          if (eaten) day[key] = true;
          else delete day[key];
          return { eaten: { ...state.eaten, [date]: day } };
        }),

      markMealEaten: (date, mealKey) =>
        set((state) => {
          if (!state.plan) return state;
          const meal = mealsForDate(state.plan, date).find((m) => m.key === mealKey);
          if (!meal) return state;
          const day = { ...state.eaten[date] };
          for (const entry of mealEntries(meal, state.choices[date], day, extrasOf(state, date))) {
            day[entry.slot] = true;
          }
          return { eaten: { ...state.eaten, [date]: day } };
        }),

      setMealEaten: (date, mealKey, eaten) =>
        set((state) => {
          if (!state.plan) return state;
          const meal = mealsForDate(state.plan, date).find((m) => m.key === mealKey);
          if (!meal) return state;
          const day = { ...state.eaten[date] };
          for (const entry of mealEntries(meal, state.choices[date], day, extrasOf(state, date))) {
            if (eaten) day[entry.slot] = true;
            else delete day[entry.slot];
          }
          return { eaten: { ...state.eaten, [date]: day } };
        }),

      addFood: (date, mealKey, food) =>
        set((state) => {
          const day = { ...state.added[date] };
          const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          day[mealKey] = [...(day[mealKey] ?? []), { ...food, id }];
          return { added: { ...state.added, [date]: day } };
        }),

      removeFood: (date, mealKey, foodId) =>
        set((state) => {
          const day = { ...state.added[date] };
          day[mealKey] = (day[mealKey] ?? []).filter((f) => f.id !== foodId);
          const eatenDay = { ...state.eaten[date] };
          delete eatenDay[slotKey(mealKey, addedCategoryId(foodId))];
          return {
            added: { ...state.added, [date]: day },
            eaten: { ...state.eaten, [date]: eatenDay },
          };
        }),

      setAddedQty: (date, mealKey, foodId, qty) =>
        set((state) => {
          const day = { ...state.added[date] };
          day[mealKey] = (day[mealKey] ?? []).map((f) => (f.id === foodId ? { ...f, qty } : f));
          return { added: { ...state.added, [date]: day } };
        }),

      setQtyOverride: (date, mealKey, categoryId, qty) =>
        set((state) => {
          const overrides = { ...state.qtyOverrides[date] };
          const key = slotKey(mealKey, categoryId);
          if (qty) overrides[key] = qty;
          else delete overrides[key];
          return { qtyOverrides: { ...state.qtyOverrides, [date]: overrides } };
        }),

      autoFill: (dates, options) =>
        set((state) => {
          const plan = state.plan;
          if (!plan) return state;

          const byDate = new Map(dates.map((date) => [date, mealsForDate(plan, date)] as const));
          const usage = new Map<string, number>();

          // Count what is already picked so the rest balances against it.
          if (!options?.overwrite) {
            for (const [date, meals] of byDate) {
              const day = state.choices[date];
              if (!day) continue;
              for (const meal of meals) {
                for (const category of meal.categories) {
                  const optionId = day[slotKey(meal.key, category.id)];
                  const option = category.options.find((o) => o.id === optionId);
                  if (option) usage.set(option.name, (usage.get(option.name) ?? 0) + 1);
                }
              }
            }
          }

          const choices = { ...state.choices };
          const declined = { ...state.declined };
          for (const [date, meals] of byDate) {
            // Starting over never touches what was already eaten.
            const day = options?.overwrite
              ? Object.fromEntries(
                  Object.entries(choices[date] ?? {}).filter(([key]) => state.eaten[date]?.[key]),
                )
              : { ...choices[date] };
            // "Rigenera" starts over; "Compila per me" leaves emptied tables empty.
            if (options?.overwrite) delete declined[date];
            for (const meal of meals) {
              for (const category of meal.categories) {
                const key = slotKey(meal.key, category.id);
                if (day[key] || declined[date]?.[key]) continue;
                const optionId = pickVaried(category, usage);
                const option = category.options.find((o) => o.id === optionId);
                if (option) usage.set(option.name, (usage.get(option.name) ?? 0) + 1);
                day[key] = optionId;
              }
            }
            choices[date] = day;
          }
          return { choices, declined };
        }),

      fillSingleOptions: (dates) =>
        set((state) => {
          if (!state.plan) return state;
          let changed = false;
          const choices = { ...state.choices };
          for (const date of dates) {
            let day: Record<SlotKey, string> | null = null;
            for (const meal of mealsForDate(state.plan, date)) {
              for (const category of meal.categories) {
                if (category.options.length !== 1) continue;
                const key = slotKey(meal.key, category.id);
                if (choices[date]?.[key] || state.declined[date]?.[key]) continue;
                day ??= { ...choices[date] };
                day[key] = category.options[0].id;
              }
            }
            if (day) {
              choices[date] = day;
              changed = true;
            }
          }
          // No new object when nothing changed, so subscribers are not woken up.
          return changed ? { choices } : state;
        }),

      clearDay: (date) =>
        set((state) => {
          const choices = { ...state.choices };
          const eaten = { ...state.eaten };
          const added = { ...state.added };
          const qtyOverrides = { ...state.qtyOverrides };
          delete choices[date];
          delete eaten[date];
          const declined = { ...state.declined };
          delete added[date];
          delete qtyOverrides[date];
          delete declined[date];
          return { choices, eaten, added, qtyOverrides, declined };
        }),

      toggleBought: (lineId) =>
        set((state) => {
          const bought = { ...state.bought };
          if (bought[lineId]) delete bought[lineId];
          else bought[lineId] = true;
          return { bought };
        }),

      resetBought: () => set({ bought: {} }),

      addExtra: (name, qty) =>
        set((state) => ({
          extras: [
            ...state.extras,
            {
              id: `extra-${Date.now()}-${state.extras.length}`,
              name: name.trim(),
              qty: qty.trim(),
            },
          ],
        })),

      removeExtra: (id) =>
        set((state) => ({
          extras: state.extras.filter((e) => e.id !== id),
          bought: Object.fromEntries(Object.entries(state.bought).filter(([k]) => k !== id)),
        })),

      setHorizon: (days) => set({ horizon: days }),

      // Week N this week means week 1 started N-1 weeks before this Monday.
      setCycleWeek: (week) =>
        set((state) => {
          if (!state.plan?.weekCycle) return state;
          const today = todayISO();
          const monday = addDays(today, -((new Date().getDay() + 6) % 7));
          const start = addDays(monday, -7 * (week - 1));
          return { plan: { ...state.plan, weekCycle: { ...state.plan.weekCycle, start } } };
        }),

      setHideBought: (value) => set({ hideBought: value }),

      markTipSeen: (id) => set((state) => ({ seenTips: { ...state.seenTips, [id]: true } })),

      resetTips: () => set({ seenTips: {} }),

      setGardenIntroSeen: () => set({ gardenIntroSeen: true }),

      // Saying no forgets the id, so a later yes starts as a new phone.
      setAnalyticsConsent: (value, installId) =>
        set({ analyticsConsent: value, installId: value ? (installId ?? null) : null }),

      setOnboarded: (value) => set({ onboarded: value }),

      setRecapTime: (time) => set({ recapTime: time }),

      registerLaunch: () => set((state) => ({ launchCount: state.launchCount + 1 })),

      setPromoRemote: (value) => set({ promoRemote: value }),

      setAuthPrompted: (value) => set({ authPrompted: value }),

      setLastBackupAt: (value) => set({ lastBackupAt: value }),

      setWeight: (date, kg) =>
        set((state) => {
          const weights = { ...state.weights };
          if (kg === null) delete weights[date];
          else weights[date] = kg;
          return { weights };
        }),

      sow: (species, since) =>
        set((state) => ({ garden: { ...state.garden, growing: { species, since } } })),

      uproot: () => set((state) => ({ garden: { ...state.garden, growing: null } })),

      harvest: (on) =>
        set((state) => {
          const { growing, grown } = state.garden;
          if (!growing) return state;
          return { garden: { growing: null, grown: [...grown, { species: growing.species, on }] } };
        }),

      restoreBackup: (data) =>
        set({
          plan: data.plan ?? null,
          choices: data.choices ?? {},
          eaten: data.eaten ?? {},
          bought: data.bought ?? {},
          extras: data.extras ?? [],
          horizon: data.horizon ?? 7,
          onboarded: data.onboarded ?? true,
          reminders: data.reminders ?? {},
          recapTime: data.recapTime ?? null,
          archive: data.archive ?? {},
          added: data.added ?? {},
          qtyOverrides: data.qtyOverrides ?? {},
          declined: data.declined ?? {},
          weights: data.weights ?? {},
          garden: data.garden ?? EMPTY_GARDEN,
        }),

      setReminder: (mealKey, time) =>
        set((state) => {
          const reminders = { ...state.reminders };
          if (time) reminders[mealKey] = time;
          else delete reminders[mealKey];
          return { reminders };
        }),
    }),
    {
      name: 'nutrime-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        plan: state.plan,
        choices: state.choices,
        eaten: state.eaten,
        bought: state.bought,
        extras: state.extras,
        horizon: state.horizon,
        onboarded: state.onboarded,
        reminders: state.reminders,
        recapTime: state.recapTime,
        archive: state.archive,
        added: state.added,
        qtyOverrides: state.qtyOverrides,
        declined: state.declined,
        weights: state.weights,
        garden: state.garden,
        launchCount: state.launchCount,
        promoRemote: state.promoRemote,
        authPrompted: state.authPrompted,
        lastBackupAt: state.lastBackupAt,
        hideBought: state.hideBought,
        seenTips: state.seenTips,
        gardenIntroSeen: state.gardenIntroSeen,
        analyticsConsent: state.analyticsConsent,
        installId: state.installId,
      }),
    },
  ),
);

/** False until the persisted state has been read back from storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useDietStore.persist.onFinishHydration(onChange),
    () => useDietStore.persist.hasHydrated(),
  );
}

/** Meals for a date, resolved against the imported plan. */
export function useMealsForDate(date: string): ResolvedMeal[] {
  const plan = useDietStore((s) => s.plan);
  if (!plan) return [];
  return mealsForDate(plan, date);
}

/** How many picks a day needs, and how many are already made or eaten. */
export function dayProgress(
  meals: ResolvedMeal[],
  choices: Record<SlotKey, string> | undefined,
  eaten: Record<SlotKey, boolean> | undefined,
  extras: DayExtras = {},
) {
  let total = 0;
  let chosen = 0;
  let done = 0;
  for (const meal of meals) {
    for (const category of meal.categories) {
      const key = slotKey(meal.key, category.id);
      total += 1;
      if (choices?.[key]) chosen += 1;
      if (eaten?.[key]) done += 1;
    }
    // Added foods count as picks already made.
    for (const food of extras.added?.[meal.key] ?? []) {
      total += 1;
      chosen += 1;
      if (eaten?.[slotKey(meal.key, addedCategoryId(food.id))]) done += 1;
    }
  }
  return { total, chosen, done };
}

type ExtrasSource = Pick<DietState, 'added' | 'qtyOverrides'>;

/** The extras of one day, as the helpers in `diet/day` take them. */
export function extrasOf(state: ExtrasSource, date: string): DayExtras {
  return { added: state.added[date], overrides: state.qtyOverrides[date] };
}

/** Reactive {@link extrasOf}: stable while that day's extras are unchanged. */
export function useDayExtras(date: string): DayExtras {
  const added = useDietStore((s) => s.added[date]);
  const overrides = useDietStore((s) => s.qtyOverrides[date]);
  return useMemo(() => ({ added, overrides }), [added, overrides]);
}

/** Planning windows offered in Settimana and Spesa: up to two weeks. */
export const HORIZONS = [3, 7, 14];

/** The dates covered by the week view and the shopping list. */
export function planningWindow(horizon: number, from = todayISO()): string[] {
  return Array.from({ length: horizon }, (_, i) => addDays(from, i));
}
