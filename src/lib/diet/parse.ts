import { fromISODate, weekdayOf } from '../dates';
import type { PdfItem, PdfPage } from '../pdf/types';
import { looksLikeWeeklyGrid, parseWeeklyGrid } from './parseGrid';
import { isQuantityText, parseQuantity } from './quantity';
import {
  formatDays,
  isDayGroupLabel,
  isUpper,
  norm,
  parseDays,
  slug,
  WEEKDAY_LABELS,
} from './text';
import type {
  DietPlan,
  FoodCategory,
  FoodComponent,
  FoodOption,
  Meal,
  MealVariant,
  PatientInfo,
  Quantity,
  ResolvedMeal,
} from './types';

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

const LINE_TOLERANCE = 2.5;
/** Fallback cut between the page header and the first table row. */
const HEADER_BAND = 95;
/** The header/body split is searched within this fraction of the page height. */
const HEADER_SEARCH = 0.16;
/** How far off the page centre a header line may sit, in points. */
const HEADER_CENTRE_TOLERANCE = 30;
/** Horizontal gap that separates two table columns, in points. */
const COLUMN_GUTTER = 40;
/** How far a category header must be indented from the column's left margin. */
const INDENT_THRESHOLD = 12;
/** Extra indent that marks a component row inside a composite dish. */
const COMPONENT_INDENT = 2.5;

type Line = {
  y: number;
  items: PdfItem[];
  /** Text of the line without its quantity cell. */
  nameText: string;
  /** Left edge of the first non-quantity item, or `null` on quantity-only lines. */
  xStart: number | null;
  qty: Quantity | null;
};

type LineKind =
  'row' | 'qtyOnly' | 'dayGroup' | 'continuation' | 'free' | 'section' | 'category' | 'text';

type Classified = Line & { kind: LineKind; continuationOf?: string };

function groupIntoLines(items: PdfItem[]): PdfItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PdfItem[][] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - item.y) <= LINE_TOLERANCE) last.push(item);
    else lines.push([item]);
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  return lines;
}

function joinItems(items: PdfItem[]): string {
  return items
    .map((i) => i.s)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a line wherever a gap wide enough to be a column gutter appears. */
function lineSegments(line: PdfItem[]): PdfItem[][] {
  const segments: PdfItem[][] = [];
  for (const item of line) {
    const current = segments[segments.length - 1];
    const previous = current?.[current.length - 1];
    if (current && previous && item.x - (previous.x + previous.w) <= COLUMN_GUTTER) {
      current.push(item);
    } else {
      segments.push([item]);
    }
  }
  return segments;
}

/**
 * Page titles are centred on the page, while table headings are centred on their
 * own column. The header is therefore the leading run of single-block, page-centred
 * lines at the top of the page; the body starts at the first line that breaks it.
 */
function headerCutoff(page: PdfPage): number {
  const pageCentre = page.width / 2;
  const limit = page.height * HEADER_SEARCH;
  const lines = groupIntoLines(page.items).filter((l) => l[0].y < limit);

  for (const line of lines) {
    const segments = lineSegments(line);
    const centred =
      segments.length === 1 &&
      Math.abs(
        (line[0].x + (line[line.length - 1].x + line[line.length - 1].w)) / 2 - pageCentre,
      ) <= HEADER_CENTRE_TOLERANCE;
    if (!centred) return line[0].y - 1;
  }
  return lines.length ? limit : HEADER_BAND;
}

/**
 * Footers repeat verbatim across pages. Finding them by repetition — rather than
 * by a fixed band — keeps the last table row of a full page from being dropped.
 */
function footerCutoff(pages: PdfPage[]): Map<number, number> {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const seen = new Set<string>();
    for (const item of page.items) {
      if (item.y < page.height * 0.8) continue;
      const key = item.s.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.3));
  const repeated = new Set([...counts].filter(([, c]) => c >= threshold).map(([k]) => k));

  const cutoffs = new Map<number, number>();
  for (const page of pages) {
    let cut = page.height;
    for (const item of page.items) {
      if (item.y < page.height * 0.8) continue;
      if (repeated.has(item.s.trim())) cut = Math.min(cut, item.y);
    }
    cutoffs.set(page.n, cut - 2);
  }
  return cutoffs;
}

/**
 * Find the x positions where quantity cells end. Progeo plans right-align every
 * quantity, so each cluster of right edges is one table column.
 */
function findColumnEdges(items: PdfItem[], pageWidth: number): number[] {
  const edges: number[] = [];
  for (const item of items) {
    if (!isQuantityText(item.s)) continue;
    const right = item.x + item.w;
    // Quantities never sit in the far-left margin.
    if (right < pageWidth * 0.2) continue;
    edges.push(right);
  }
  if (!edges.length) return [];

  edges.sort((a, b) => a - b);
  const clusters: { edge: number; count: number }[] = [];
  for (const e of edges) {
    const last = clusters[clusters.length - 1];
    if (last && e - last.edge <= 4) {
      last.count += 1;
      last.edge = (last.edge * (last.count - 1) + e) / last.count;
    } else {
      clusters.push({ edge: e, count: 1 });
    }
  }
  return clusters.map((c) => c.edge);
}

/* -------------------------------------------------------------------------- */
/* Line building                                                              */
/* -------------------------------------------------------------------------- */

function buildLines(items: PdfItem[], columnEdge: number): Line[] {
  return groupIntoLines(items).map((lineItems) => {
    const last = lineItems[lineItems.length - 1];
    const qty = last && Math.abs(last.x + last.w - columnEdge) <= 4 ? parseQuantity(last.s) : null;
    const nameItems = qty ? lineItems.slice(0, -1) : lineItems;
    return {
      y: lineItems[0].y,
      items: lineItems,
      nameText: joinItems(nameItems),
      xStart: nameItems.length ? nameItems[0].x : null,
      qty,
    };
  });
}

const CONTINUATION_RE = /^[.…]{2,}\s*continua\s+(.+)$/i;
const FREE_MEAL_RE = /^(pasto|giorno)\s+liber[oa]$/i;

function classify(lines: Line[], colLeft: number): Classified[] {
  const out: Classified[] = lines.map((line) => {
    if (line.qty && line.nameText) return { ...line, kind: 'row' as const };
    if (line.qty) return { ...line, kind: 'qtyOnly' as const };

    const text = line.nameText;
    if (!text) return { ...line, kind: 'text' as const };

    if (isDayGroupLabel(text)) return { ...line, kind: 'dayGroup' as const };

    const cont = text.match(CONTINUATION_RE);
    if (cont) return { ...line, kind: 'continuation' as const, continuationOf: cont[1].trim() };

    if (FREE_MEAL_RE.test(text)) return { ...line, kind: 'free' as const };

    const indented = line.xStart !== null && line.xStart > colLeft + INDENT_THRESHOLD;
    if (isUpper(text) && indented) return { ...line, kind: 'section' as const };
    if (indented) return { ...line, kind: 'category' as const };

    return { ...line, kind: 'text' as const };
  });

  // A flush-left line followed by an indented row heads a composite dish.
  for (let i = 0; i < out.length; i++) {
    if (out[i].kind !== 'text') continue;
    const next = out[i + 1];
    if (
      next &&
      next.kind === 'row' &&
      next.xStart !== null &&
      out[i].xStart !== null &&
      next.xStart > (out[i].xStart as number) + COMPONENT_INDENT
    ) {
      out[i] = { ...out[i], kind: 'category' as LineKind, continuationOf: '__composite__' };
    }
  }

  return out;
}

/**
 * Attach wrapped name fragments to the row they belong to. The generator centres
 * a quantity vertically against a two-line name, so nearest-by-y is the right rule.
 */
function attachFragments(lines: Classified[]): Map<number, string[]> {
  const anchors = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.kind === 'row' || l.kind === 'qtyOnly');
  const fragments = new Map<number, string[]>();
  if (!anchors.length) return fragments;

  const gaps: number[] = [];
  for (let i = 1; i < anchors.length; i++) gaps.push(anchors[i].l.y - anchors[i - 1].l.y);
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 15;
  const maxDistance = Math.min(12, medianGap * 0.85);

  lines.forEach((line, index) => {
    if (line.kind !== 'text' || !line.nameText) return;
    let best: { i: number; d: number } | null = null;
    for (const anchor of anchors) {
      const d = Math.abs(anchor.l.y - line.y);
      if (!best || d < best.d) best = { i: anchor.i, d };
    }
    if (!best || best.d > maxDistance) return;
    const list = fragments.get(best.i) ?? [];
    list.push(`${line.y}\u0000${line.nameText}`);
    fragments.set(best.i, list);
    lines[index] = { ...line, kind: 'text', nameText: '' };
  });

  return fragments;
}

/* -------------------------------------------------------------------------- */
/* Page model                                                                 */
/* -------------------------------------------------------------------------- */

type PageEvent =
  | { type: 'dayGroup'; label: string }
  | { type: 'section'; label: string }
  | { type: 'category'; name: string }
  | { type: 'continuation'; name: string }
  | { type: 'free' }
  | { type: 'option'; option: FoodOption }
  | { type: 'composite'; name: string };

function readColumnEvents(lines: Classified[], columnEdge: number): PageEvent[] {
  const fragments = attachFragments(lines);
  const events: PageEvent[] = [];
  let composite: { name: string; components: FoodComponent[]; xStart: number } | null = null;

  const flushComposite = () => {
    if (!composite) return;
    const total = composite.components.reduce<Quantity>(
      (acc, c) => ({
        raw: '',
        amount: acc.amount !== null && c.qty.amount !== null ? acc.amount + c.qty.amount : null,
        unit: 'g',
      }),
      { raw: '', amount: 0, unit: 'g' },
    );
    events.push({
      type: 'option',
      option: {
        id: slug(composite.name),
        name: composite.name,
        qty: {
          raw: composite.components.map((c) => c.qty.raw).join(' + '),
          amount: total.amount,
          unit: 'g',
        },
        components: composite.components,
      },
    });
    composite = null;
  };

  lines.forEach((line, index) => {
    const frags = (fragments.get(index) ?? [])
      .map((f) => {
        const [y, text] = f.split('\u0000');
        return { y: Number(y), text };
      })
      .sort((a, b) => a.y - b.y);

    switch (line.kind) {
      case 'dayGroup':
        flushComposite();
        events.push({ type: 'dayGroup', label: line.nameText });
        break;

      case 'section':
        flushComposite();
        events.push({ type: 'section', label: line.nameText });
        break;

      case 'continuation':
        flushComposite();
        events.push({ type: 'continuation', name: line.continuationOf ?? '' });
        break;

      case 'free':
        flushComposite();
        events.push({ type: 'free' });
        break;

      case 'category':
        if (line.continuationOf === '__composite__') {
          flushComposite();
          composite = { name: line.nameText, components: [], xStart: line.xStart ?? 0 };
        } else {
          flushComposite();
          events.push({ type: 'category', name: line.nameText });
        }
        break;

      case 'row':
      case 'qtyOnly': {
        if (!line.qty) break;
        const parts = [...frags];
        if (line.nameText) parts.push({ y: line.y, text: line.nameText });
        parts.sort((a, b) => a.y - b.y);
        const name = parts
          .map((p) => p.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .replace(/\s+\)/g, ')')
          .trim();
        if (!name) break;

        if (
          composite &&
          line.xStart !== null &&
          line.xStart > composite.xStart + COMPONENT_INDENT
        ) {
          composite.components.push({ name, qty: line.qty });
          break;
        }
        flushComposite();
        events.push({ type: 'option', option: { id: slug(name), name, qty: line.qty } });
        break;
      }

      default:
        break;
    }
  });

  flushComposite();
  return events;
}

function readPageEvents(page: PdfPage, footerY: number): { title: string; events: PageEvent[] } {
  const headerY = headerCutoff(page);
  const header = page.items.filter((i) => i.y < headerY);
  const body = page.items.filter((i) => i.y >= headerY && i.y < footerY);

  const headerLines = groupIntoLines(header).map(joinItems).filter(Boolean);
  const title = headerLines.length ? headerLines[headerLines.length - 1] : '';

  const edges = findColumnEdges(body, page.width);
  const columns: PdfItem[][] = edges.length ? edges.map(() => []) : [[]];
  for (const item of body) {
    const index = edges.length ? edges.filter((e) => e < item.x).length : 0;
    columns[Math.min(index, columns.length - 1)].push(item);
  }

  const events: PageEvent[] = [];
  columns.forEach((colItems, index) => {
    if (!colItems.length) return;
    const edge = edges[index] ?? page.width;
    const lines = buildLines(colItems, edge);
    const colLeft = Math.min(
      ...lines.filter((l) => l.xStart !== null).map((l) => l.xStart as number),
    );
    if (!Number.isFinite(colLeft)) return;
    events.push(...readColumnEvents(classify(lines, colLeft), edge));
  });

  return { title, events };
}

/* -------------------------------------------------------------------------- */
/* Meal assembly                                                              */
/* -------------------------------------------------------------------------- */

const MEAL_ORDER: { match: RegExp; order: number; name: string }[] = [
  { match: /^colazione$/, order: 10, name: 'Colazione' },
  { match: /^(meta|met[àa]) mattina$/, order: 20, name: 'Metà mattina' },
  { match: /^spuntino( mattutino)?$/, order: 20, name: 'Spuntino' },
  { match: /^pranzo$/, order: 30, name: 'Pranzo' },
  { match: /^merenda$/, order: 40, name: 'Merenda' },
  { match: /^(meta|met[àa]) pomeriggio$/, order: 40, name: 'Metà pomeriggio' },
  { match: /^cena$/, order: 50, name: 'Cena' },
  { match: /^dopo cena$/, order: 60, name: 'Dopo cena' },
  { match: /^(spuntino serale|pre.?nanna)$/, order: 60, name: 'Spuntino serale' },
  { match: /^arco della giornata$/, order: 70, name: 'Arco della giornata' },
];

const ALL_DAY_KEY = 'arco-della-giornata';

function mealMeta(rawTitle: string): { key: string; name: string; order: number } {
  const n = norm(rawTitle);
  for (const meal of MEAL_ORDER) {
    if (meal.match.test(n)) return { key: slug(meal.name), name: meal.name, order: meal.order };
  }
  const name = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
  return { key: slug(rawTitle), name, order: 45 };
}

const DAILY_TITLE_RE = /^piano alimentare\s*[-–]\s*(.+?)\s*[-–]\s*(.+)$/i;

/** Accumulates categories into variants while walking a page's event stream. */
class MealBuilder {
  private meals = new Map<string, Meal>();

  private variantOf(mealKey: string, name: string, order: number, days: number[], label: string) {
    let meal = this.meals.get(mealKey);
    if (!meal) {
      meal = { key: mealKey, name, order, variants: [] };
      this.meals.set(mealKey, meal);
    }
    const signature = days.join(',');
    let variant = meal.variants.find((v) => v.days.join(',') === signature);
    if (!variant) {
      variant = {
        id: `${mealKey}-${signature || 'all'}`,
        daysLabel: label || formatDays(days),
        days,
        categories: [],
        free: false,
      };
      meal.variants.push(variant);
    }
    return variant;
  }

  addPage(title: string, events: PageEvent[], warnings: string[]) {
    const daily = title.match(DAILY_TITLE_RE);

    let currentDays: number[] = [];
    let currentLabel = '';
    let meta = mealMeta(title);
    let section: string | null = null;
    let variant: MealVariant | null = null;
    let category: FoodCategory | null = null;

    if (daily) {
      const day = parseDays(daily[1]);
      if (!day.length) {
        warnings.push(`Giorno non riconosciuto: "${daily[1]}"`);
        return;
      }
      currentDays = day;
      currentLabel = WEEKDAY_LABELS[day[0] - 1];
      meta = mealMeta(daily[2]);
      variant = this.variantOf(meta.key, meta.name, meta.order, currentDays, currentLabel);
    }

    const ensureVariant = (): MealVariant | null => {
      if (variant) return variant;
      if (!currentDays.length) return null;
      variant = this.variantOf(meta.key, meta.name, meta.order, currentDays, currentLabel);
      return variant;
    };

    const targetVariant = (): MealVariant | null => {
      const v = ensureVariant();
      if (!v) return null;
      // Sub-sections labelled "arco della giornata" belong to the whole day.
      if (section && norm(section) === 'arco della giornata' && daily) {
        return this.variantOf(ALL_DAY_KEY, 'Arco della giornata', 70, currentDays, currentLabel);
      }
      return v;
    };

    for (const event of events) {
      switch (event.type) {
        case 'dayGroup': {
          currentDays = parseDays(event.label);
          currentLabel = event.label
            .split(/,/)
            .map((p) => p.trim().toLowerCase())
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(', ');
          section = null;
          category = null;
          variant = null;
          if (!currentDays.length) warnings.push(`Giorni non riconosciuti: "${event.label}"`);
          break;
        }

        case 'section':
          section = event.label;
          category = null;
          break;

        case 'category': {
          const v = targetVariant();
          if (!v) break;
          const existing = v.categories.find((c) => norm(c.name) === norm(event.name));
          if (existing) {
            category = existing;
          } else {
            category = {
              id: `${v.id}-${slug(event.name)}`,
              name: event.name,
              section: section && norm(section) !== 'arco della giornata' ? section : null,
              options: [],
            };
            v.categories.push(category);
          }
          break;
        }

        case 'continuation': {
          const v = targetVariant();
          if (!v) break;
          const existing = v.categories.find((c) => norm(c.name) === norm(event.name));
          category = existing ?? null;
          if (!existing) {
            category = {
              id: `${v.id}-${slug(event.name)}`,
              name: event.name,
              section: null,
              options: [],
            };
            v.categories.push(category);
          }
          break;
        }

        case 'free': {
          const v = ensureVariant();
          if (v) v.free = true;
          break;
        }

        case 'option': {
          const v = targetVariant();
          if (!v) break;
          if (!category || !v.categories.includes(category)) {
            category = {
              id: `${v.id}-${slug(section ?? meta.name)}`,
              name: section ?? meta.name,
              section: null,
              options: [],
            };
            v.categories.push(category);
          }
          if (category.options.some((o) => o.id === event.option.id)) break;
          category.options.push({ ...event.option, id: `${category.id}-${event.option.id}` });
          break;
        }

        default:
          break;
      }
    }
  }

  build(): Meal[] {
    return [...this.meals.values()]
      .map((meal) => ({
        ...meal,
        variants: meal.variants
          .filter((v) => v.free || v.categories.some((c) => c.options.length))
          .map((v) => ({ ...v, categories: v.categories.filter((c) => c.options.length) }))
          .sort((a, b) => (a.days[0] ?? 0) - (b.days[0] ?? 0)),
      }))
      .filter((meal) => meal.variants.length)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }
}

/* -------------------------------------------------------------------------- */
/* Patient details                                                            */
/* -------------------------------------------------------------------------- */

const DETAIL_LABELS = /^(sesso|et[àa]|altezza|peso|bmi|bsa|bmr|visita del)(?!\p{L})/iu;

/**
 * The cover page lays out `label:` / `value` pairs across four columns. Walking
 * the line left to right and closing a label on its colon recovers every pair,
 * including two-part labels such as `BMI` + `(Body Mass Index):`.
 */
function readDetailPairs(items: PdfItem[]): { label: string; value: string }[] {
  const cells = items.map((i) => i.s.trim()).filter(Boolean);
  const pairs: { label: string; value: string }[] = [];
  let buffer: string[] = [];
  let label: string | null = null;

  for (const cell of cells) {
    if (label !== null) {
      pairs.push({ label, value: cell });
      label = null;
      continue;
    }
    buffer.push(cell.endsWith(':') ? cell.slice(0, -1).trim() : cell);
    if (cell.endsWith(':')) {
      label = buffer.join(' ').trim();
      buffer = [];
    }
  }
  return pairs;
}

function readPatient(pages: PdfPage[]): PatientInfo {
  const info: PatientInfo = { name: null, professional: null, visitDate: null, details: [] };

  for (const page of pages.slice(0, 4)) {
    for (const items of groupIntoLines(page.items)) {
      const text = joinItems(items);

      const professional = text.match(/elaborato da\s*:\s*(\S.*)/i);
      if (professional && !info.professional) info.professional = professional[1].trim();

      if (!DETAIL_LABELS.test(text)) continue;
      for (const { label, value } of readDetailPairs(items)) {
        if (!DETAIL_LABELS.test(label)) continue;
        if (/^visita del/i.test(label)) {
          info.visitDate = value;
        } else if (!info.details.some((d) => norm(d.label) === norm(label))) {
          info.details.push({ label, value });
        }
      }
    }
  }

  // The patient name is the line repeated as a header on every plan page.
  const counts = new Map<string, number>();
  for (const page of pages) {
    const cut = headerCutoff(page);
    for (const item of page.items) {
      if (item.y > cut) continue;
      const text = item.s.trim();
      if (!text || text.length > 60 || /piano alimentare|elaborato/i.test(text)) continue;
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 3) info.name = best[0];

  return info;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/** True when the page actually carries a food table we can read. */
function isPlanPage(title: string, events: PageEvent[]): boolean {
  if (!title) return false;
  if (/^(premesse|pesi e misure|norme generali)/i.test(title)) return false;
  if (DAILY_TITLE_RE.test(title)) return true;
  if (isUpper(title)) return false;
  const hasDays = events.some((e) => e.type === 'dayGroup');
  const hasOptions = events.some((e) => e.type === 'option');
  return hasDays && hasOptions;
}

export function parseDietPages(pages: PdfPage[], sourceName: string): DietPlan {
  // Word-style plans with one table per day have their own reader.
  if (looksLikeWeeklyGrid(pages)) return parseWeeklyGrid(pages, sourceName);

  const warnings: string[] = [];
  const builder = new MealBuilder();
  const footers = footerCutoff(pages);

  for (const page of pages) {
    const { title, events } = readPageEvents(page, footers.get(page.n) ?? page.height);
    if (!isPlanPage(title, events)) continue;
    builder.addPage(title, events, warnings);
  }

  const meals = builder.build();
  if (!meals.length) {
    warnings.push('Nessun pasto riconosciuto nel PDF.');
  }

  return {
    id: `${Date.now()}`,
    sourceName,
    importedAt: Date.now(),
    patient: readPatient(pages),
    meals,
    warnings,
  };
}

/**
 * Meals that apply to a given ISO weekday, flattened for the UI.
 *
 * A meal can match several variants at once — `Arco della giornata` has both a
 * week-wide table and a per-day one — so matching variants are merged.
 */
export function mealsForWeekday(plan: DietPlan, weekday: number, week?: number): ResolvedMeal[] {
  return plan.meals
    .map((meal) => {
      const variants = meal.variants.filter(
        (v) =>
          v.days.includes(weekday) &&
          (v.week === undefined || week === undefined || v.week === week),
      );
      if (!variants.length) return null;

      const categories: FoodCategory[] = [];
      for (const variant of variants) {
        for (const category of variant.categories) {
          const existing = categories.find((c) => norm(c.name) === norm(category.name));
          if (existing) {
            for (const option of category.options) {
              if (!existing.options.some((o) => norm(o.name) === norm(option.name))) {
                existing.options.push(option);
              }
            }
          } else {
            categories.push({ ...category, options: [...category.options] });
          }
        }
      }

      const specific = variants.find((v) => v.days.length < 7) ?? variants[0];
      return {
        key: meal.key,
        name: meal.name,
        order: meal.order,
        free: variants.every((v) => v.free) && !categories.length,
        daysLabel: specific.daysLabel,
        categories,
      };
    })
    .filter((m): m is ResolvedMeal => m !== null)
    .sort((a, b) => a.order - b.order);
}

/** For plans that rotate over several weeks, which week (1-based) `date` falls in. */
export function cycleWeek(plan: DietPlan, date: string): number | undefined {
  if (!plan.weekCycle) return undefined;
  const { weeks, start } = plan.weekCycle;
  const days = Math.round(
    (fromISODate(date).getTime() - fromISODate(start).getTime()) / 86_400_000,
  );
  const index = Math.floor(days / 7);
  return (((index % weeks) + weeks) % weeks) + 1;
}

/** Meals of a calendar day: its weekday and, in rotating plans, its week. */
export function mealsForDate(plan: DietPlan, date: string): ResolvedMeal[] {
  return mealsForWeekday(plan, weekdayOf(date), cycleWeek(plan, date));
}

/** False when every table of these meals has a single food: nothing to pick, only to tick. */
export function hasChoices(meals: ResolvedMeal[]): boolean {
  return meals.some((m) => m.categories.some((c) => c.options.length > 1));
}
