import { slotKey, type SlotKey } from './slots';
import type { FoodCategory, FoodOption, ResolvedMeal } from './types';

/** A food added by hand to one meal of one day, on top of the plan. */
export type AddedFood = {
  id: string;
  name: string;
  /** Quantity as typed, e.g. `150 g`, `1 vasetto`. */
  qty: string;
  source: 'custom' | 'plan' | 'openfoodfacts';
  brand?: string | null;
  /** Energy per 100 g from Open Food Facts, when known. */
  kcal100?: number | null;
};

/** What a single day adds to the plan: extra foods and edited quantities. */
export type DayExtras = {
  /** mealKey → foods added to that meal. */
  added?: Record<string, AddedFood[]>;
  /** slot → quantity replacing the plan's for the chosen food. */
  overrides?: Record<SlotKey, string>;
};

/** Added foods live in the same slot space as plan tables, under a marked id. */
export function addedCategoryId(foodId: string): string {
  return `+${foodId}`;
}

export type MealEntry =
  | {
      kind: 'plan';
      slot: SlotKey;
      category: FoodCategory;
      option: FoodOption;
      qty: string;
      /** True when the quantity differs from the plan's. */
      edited: boolean;
      done: boolean;
    }
  | { kind: 'added'; slot: SlotKey; food: AddedFood; qty: string; done: boolean };

/**
 * The foods actually on the table for a meal: the chosen option of each plan
 * table — with its quantity as edited for the day — followed by anything added.
 * Tables with nothing chosen are left out.
 */
export function mealEntries(
  meal: ResolvedMeal,
  choices: Record<SlotKey, string> | undefined,
  eaten: Record<SlotKey, boolean> | undefined,
  extras: DayExtras = {},
): MealEntry[] {
  const planned = meal.categories.flatMap((category): MealEntry[] => {
    const slot = slotKey(meal.key, category.id);
    const option = category.options.find((o) => o.id === choices?.[slot]);
    if (!option) return [];
    const override = extras.overrides?.[slot];
    return [
      {
        kind: 'plan',
        slot,
        category,
        option,
        qty: override ?? option.qty.raw,
        edited: override !== undefined && override !== option.qty.raw,
        done: !!eaten?.[slot],
      },
    ];
  });
  const added = (extras.added?.[meal.key] ?? []).map((food): MealEntry => {
    const slot = slotKey(meal.key, addedCategoryId(food.id));
    return { kind: 'added', slot, food, qty: food.qty, done: !!eaten?.[slot] };
  });
  return [...planned, ...added];
}

export function entryName(entry: MealEntry): string {
  return entry.kind === 'plan' ? entry.option.name : entry.food.name;
}

export function entryLabel(entry: MealEntry): string {
  return entry.kind === 'plan' ? entry.category.name : 'Aggiunto da te';
}
