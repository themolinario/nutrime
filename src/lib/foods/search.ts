import { norm } from '../diet/text';
import type { DietPlan } from '../diet/types';

export type FoodSuggestion = {
  key: string;
  name: string;
  /** Default quantity to start from, as printed (`g 120`, `1 vasetto`). */
  qty: string;
  source: 'plan' | 'openfoodfacts';
  /** Plan table it comes from, or the product's brand. */
  detail: string | null;
  kcal100: number | null;
};

/**
 * Foods from the user's own plan whose name matches — the safest suggestions,
 * since the nutritionist already approved them. Each food once, with the
 * quantity it has in the plan.
 */
export function searchPlanFoods(plan: DietPlan | null, query: string, limit = 8): FoodSuggestion[] {
  const q = norm(query);
  if (!plan || q.length < 2) return [];
  const seen = new Map<string, FoodSuggestion>();
  for (const meal of plan.meals) {
    for (const variant of meal.variants) {
      for (const category of variant.categories) {
        for (const option of category.options) {
          const key = norm(option.name);
          if (!key.includes(q) || seen.has(key)) continue;
          seen.set(key, {
            key: `plan:${key}`,
            name: option.name,
            qty: option.qty.raw,
            source: 'plan',
            detail: category.name,
            kcal100: null,
          });
        }
      }
    }
  }
  // Names starting with the query first, then the rest alphabetically.
  return [...seen.values()]
    .sort(
      (a, b) =>
        Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

type OffHit = {
  code?: string;
  product_name?: string;
  product_name_it?: string;
  brands?: string[] | string;
  nutriments?: { 'energy-kcal_100g'?: number };
};

const OFF_URL = 'https://search.openfoodfacts.org/search';

/**
 * Packaged foods from Open Food Facts, the open food database: free, no key,
 * strong on Italian supermarket products. Throws on network failure.
 */
export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal,
): Promise<FoodSuggestion[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    langs: 'it',
    page_size: '20',
    fields: 'code,product_name,product_name_it,brands,nutriments',
  });
  const response = await fetch(`${OFF_URL}?${params}`, {
    signal,
    // Open Food Facts asks apps to identify themselves.
    headers: { 'User-Agent': 'NutriMy/iOS' },
  });
  if (!response.ok) throw new Error(`Open Food Facts: ${response.status}`);
  const { hits = [] } = (await response.json()) as { hits?: OffHit[] };

  const seen = new Set<string>();
  const out: FoodSuggestion[] = [];
  for (const hit of hits) {
    const name = (hit.product_name_it || hit.product_name || '').trim();
    if (!name) continue;
    const brand = (Array.isArray(hit.brands) ? hit.brands[0] : hit.brands)?.trim() || null;
    const key = `${norm(name)}|${norm(brand ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const kcal = hit.nutriments?.['energy-kcal_100g'];
    out.push({
      key: `off:${hit.code ?? key}`,
      name,
      qty: 'g 100',
      source: 'openfoodfacts',
      detail: brand,
      kcal100: typeof kcal === 'number' && Number.isFinite(kcal) ? Math.round(kcal) : null,
    });
    if (out.length >= 10) break;
  }
  return out;
}
