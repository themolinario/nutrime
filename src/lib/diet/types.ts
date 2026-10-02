/** Quantity as printed in the plan, plus a parsed form when we can read one. */
export type Quantity = {
  /** Exactly what the PDF shows, e.g. `g 200`, `1 vasetto`, `4 cucchiaini`. */
  raw: string;
  /** Numeric amount when the quantity is measurable, else `null`. */
  amount: number | null;
  /** Unit when known: `g`, `ml`, `vasetto`, `cucchiaini`, … */
  unit: string | null;
};

/** One ingredient of a composite dish (e.g. the bresaola inside an insalatona). */
export type FoodComponent = { name: string; qty: Quantity };

/** A single choosable food inside a category. */
export type FoodOption = {
  id: string;
  name: string;
  qty: Quantity;
  /** Present when the option is a composite dish made of several weighed items. */
  components?: FoodComponent[];
};

/** A table in the plan: pick exactly one option from it. */
export type FoodCategory = {
  id: string;
  name: string;
  /** Label of the sub-section it belongs to, e.g. `ARCO DELLA GIORNATA`. */
  section: string | null;
  options: FoodOption[];
};

/** One day-group of a meal, e.g. "LUNEDÌ, MERCOLEDÌ, VENERDÌ". */
export type MealVariant = {
  id: string;
  daysLabel: string;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  days: number[];
  categories: FoodCategory[];
  /** True for `Pasto libero` — nothing to choose. */
  free: boolean;
  /** In plans that rotate over several weeks, the week (1-based) this variant belongs to. */
  week?: number;
};

export type Meal = {
  key: string;
  name: string;
  /** Position within a day, lower comes first. */
  order: number;
  variants: MealVariant[];
};

export type PatientInfo = {
  name: string | null;
  professional: string | null;
  visitDate: string | null;
  details: { label: string; value: string }[];
};

export type DietPlan = {
  id: string;
  sourceName: string;
  importedAt: number;
  patient: PatientInfo;
  meals: Meal[];
  /** Diagnostics collected while parsing, surfaced in the plan screen. */
  warnings: string[];
  /**
   * Plans whose menu changes week by week (week 1, week 2, …): how many weeks,
   * and the Monday (`YYYY-MM-DD`) on which week 1 starts.
   */
  weekCycle?: { weeks: number; start: string };
};

/** A meal resolved for one specific weekday. */
export type ResolvedMeal = {
  key: string;
  name: string;
  order: number;
  free: boolean;
  daysLabel: string;
  categories: FoodCategory[];
};
