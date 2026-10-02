import { mealsForDate } from './parse';
import type { SlotKey } from './slots';
import { mealEntries, type DayExtras } from './day';
import { addQuantities, formatQuantity, parseQuantity } from './quantity';
import { norm, slug } from './text';
import type { DietPlan, Quantity } from './types';

/** Supermarket aisles, in the order you usually walk them. */
export const AISLES = [
  'Frutta e verdura',
  'Carne',
  'Pesce',
  'Latticini e uova',
  'Salumi',
  'Pane e cereali',
  'Dispensa',
  'Bevande',
  'Altro',
] as const;

export type Aisle = (typeof AISLES)[number];

const AISLE_RULES: { aisle: Aisle; match: RegExp }[] = [
  { aisle: 'Frutta e verdura', match: /frutta|verdur|contorn|insalat|legum.*fresc|ortagg|funghi/ },
  { aisle: 'Carne', match: /carne fresc|pollo|tacchino|manzo|vitello|agnello|maiale|hamburger/ },
  { aisle: 'Pesce', match: /pesce/ },
  { aisle: 'Salumi', match: /carne conserv|salum|prosciutt|bresaola|affettat/ },
  { aisle: 'Latticini e uova', match: /formagg|latticin|yogurt|latte|uova|ricotta|mozzarell/ },
  {
    aisle: 'Pane e cereali',
    match: /pane|cereal|pasta|riso|farro|orzo|wasa|frisell|piadin|fiocch/,
  },
  { aisle: 'Bevande', match: /acqu|bevand|t[èe]\b|caff/ },
  {
    aisle: 'Dispensa',
    match: /olio|legumi secch|noci|crema|creme|burro|proteine|conserv|mais|patat|spalmabil/,
  },
];

/** Best-guess aisle for a food, based on its category and its own name. */
export function aisleFor(categoryName: string, foodName: string): Aisle {
  const haystack = `${norm(categoryName)} ${norm(foodName)}`;
  for (const rule of AISLE_RULES) {
    if (rule.match.test(haystack)) return rule.aisle;
  }
  return 'Altro';
}

export type ShoppingLine = {
  id: string;
  name: string;
  /** Summed quantity when every occurrence shares a unit, else a breakdown. */
  qtyLabel: string;
  aisle: Aisle;
  /** How many meals across the window call for this food. */
  times: number;
  /** Dates the food is needed on, for the detail line. */
  dates: string[];
  manual?: boolean;
};

type Accumulator = {
  name: string;
  aisle: Aisle;
  total: Quantity | null;
  /** Raw quantities kept whenever they cannot be summed. */
  raws: string[];
  times: number;
  dates: Set<string>;
};

/**
 * Build the shopping list for a set of dates from what the user actually chose.
 *
 * Composite dishes are expanded into their ingredients — you buy the bresaola
 * and the rocket, not "insalatona".
 */
export function buildShoppingList(
  plan: DietPlan | null,
  dates: string[],
  choices: Record<string, Record<SlotKey, string>>,
  extrasFor?: (date: string) => DayExtras | undefined,
): ShoppingLine[] {
  if (!plan) return [];

  const acc = new Map<string, Accumulator>();

  const add = (name: string, qty: Quantity, aisle: Aisle, date: string) => {
    const key = norm(name);
    const existing = acc.get(key);
    if (!existing) {
      acc.set(key, {
        name,
        aisle,
        total: qty.amount !== null ? { ...qty } : null,
        raws: qty.amount === null ? [qty.raw] : [],
        times: 1,
        dates: new Set([date]),
      });
      return;
    }
    existing.times += 1;
    existing.dates.add(date);
    if (existing.total && qty.amount !== null) {
      const sum = addQuantities(existing.total, qty);
      if (sum) {
        existing.total = sum;
        return;
      }
    }
    if (existing.total) {
      existing.raws.push(existing.total.raw);
      existing.total = null;
    }
    existing.raws.push(qty.raw);
  };

  for (const date of dates) {
    const extras = extrasFor?.(date);
    const meals = mealsForDate(plan, date);

    for (const meal of meals) {
      for (const entry of mealEntries(meal, choices[date], undefined, extras)) {
        if (entry.kind === 'added') {
          const qty = parseQuantity(entry.qty) ?? { raw: entry.qty, amount: null, unit: null };
          add(entry.food.name, qty, aisleFor('', entry.food.name), date);
          continue;
        }
        const { option, category } = entry;
        const qty = entry.edited ? (parseQuantity(entry.qty) ?? option.qty) : option.qty;

        if (option.components?.length) {
          // An edited dish scales its ingredients by the same ratio, when comparable.
          const ratio =
            entry.edited && qty.amount !== null && option.qty.amount && qty.unit === option.qty.unit
              ? qty.amount / option.qty.amount
              : 1;
          for (const component of option.components) {
            const scaled =
              ratio !== 1 && component.qty.amount !== null
                ? {
                    ...component.qty,
                    amount: component.qty.amount * ratio,
                    raw: formatQuantity(component.qty.amount * ratio, component.qty.unit),
                  }
                : component.qty;
            add(component.name, scaled, aisleFor(category.name, component.name), date);
          }
        } else {
          add(option.name, qty, aisleFor(category.name, option.name), date);
        }
      }
    }
  }

  const lines: ShoppingLine[] = [...acc.entries()].map(([key, value]) => {
    const parts = [...value.raws];
    if (value.total) {
      parts.unshift(
        value.total.amount !== null
          ? formatQuantity(value.total.amount, value.total.unit)
          : value.total.raw,
      );
    }
    return {
      id: `shop-${slug(key)}`,
      name: value.name,
      qtyLabel: parts.join(' + '),
      aisle: value.aisle,
      times: value.times,
      dates: [...value.dates].sort(),
    };
  });

  return lines.sort(
    (a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name),
  );
}

/** Group lines by aisle, dropping aisles with nothing in them. */
export function groupByAisle(lines: ShoppingLine[]): { aisle: string; lines: ShoppingLine[] }[] {
  return AISLES.map((aisle) => ({ aisle, lines: lines.filter((l) => l.aisle === aisle) })).filter(
    (group) => group.lines.length > 0,
  );
}
