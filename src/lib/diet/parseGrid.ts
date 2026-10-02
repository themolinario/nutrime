import type { PdfItem, PdfPage } from '../pdf/types';
import { parseQuantity } from './quantity';
import { norm, slug, WEEKDAY_LABELS, weekdayFromName } from './text';
import type { DietPlan, FoodCategory, Meal, MealVariant, PatientInfo, Quantity } from './types';

/*
 * Weekly-grid plans, typically written in Word: one table per day, one column
 * per meal (COLAZIONE · SPUNTINO · PRANZO · SPUNTINO · CENA), one row per
 * course, free text in the cells. Plans often repeat the week twice with
 * different menus (week 1, week 2, …), which become a rotation.
 *
 * Nothing is chosen here: every course is a fixed item of that day, so each
 * table of the app has a single option and the day comes already filled in.
 */

const LINE_TOLERANCE = 2.5;
/** How much taller than a normal line break a gap must be to start a new table row. */
const ROW_GAP_FACTOR = 1.5;

type Column = { key: string; name: string; order: number; center: number; left: number };
type CellLine = { y: number; text: string };
/** One day of one week: the courses of each meal column, keyed by meal. */
export type Grid = { week: number; weekday: number; free: boolean; cells: Map<string, string[]> };
export type GridColumn = { key: string; name: string; order: number };

const MEAL_COLUMNS: { match: RegExp; name: string; order: number }[] = [
  { match: /^colazione$/, name: 'Colazione', order: 10 },
  { match: /^(spuntino|meta mattina|merenda|meta pomeriggio)$/, name: 'Spuntino', order: 20 },
  { match: /^pranzo$/, name: 'Pranzo', order: 30 },
  { match: /^cena$/, name: 'Cena', order: 50 },
  { match: /^(dopo cena|spuntino serale)$/, name: 'Dopo cena', order: 60 },
];

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

/** Joins runs, gluing the ones Word splits mid-word (`V` + `erdura`, `(2` + `0g)`). */
function joinRuns(items: PdfItem[]): string {
  let out = '';
  let end = -Infinity;
  for (const item of items) {
    const glued = item.x - end < 1;
    out += (out && !glued ? ' ' : '') + item.s;
    end = item.x + item.w;
  }
  return out.replace(/\s+/g, ' ').trim();
}

const lineText = (line: PdfItem[]) => joinRuns(line);

/**
 * Meal columns from a header row's labels, or null when it is not one: at least
 * three meal names, all in capitals. Two snack columns become mid-morning and
 * mid-afternoon.
 */
export function mealColumns(labels: string[]): GridColumn[] | null {
  const cols: GridColumn[] = [];
  for (const label of labels) {
    const meta = MEAL_COLUMNS.find((m) => m.match.test(norm(label)));
    if (!meta || label !== label.toUpperCase()) return null;
    cols.push({ key: '', name: meta.name, order: meta.order });
  }
  if (cols.length < 3) return null;
  const snacks = cols.filter((c) => c.name === 'Spuntino');
  if (snacks.length === 2) Object.assign(snacks[1], { name: 'Merenda', order: 40 });
  for (const col of cols) col.key = slug(col.name);
  return cols;
}

function headerColumns(line: PdfItem[]): Column[] | null {
  const cols = mealColumns(line.map((i) => i.s));
  return cols?.map((c, i) => ({ ...c, center: line[i].x + line[i].w / 2, left: 0 })) ?? null;
}

/** `Lunedì`, `MARTEDÌ`, `DOMENICA: GIORNO LIBERO` → weekday and whether it is free. */
export function dayTitle(text: string): { weekday: number; free: boolean } | null {
  const match = norm(text).match(
    /^(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\b[\s:.-]*(.*)$/,
  );
  if (!match) return null;
  const weekday = weekdayFromName(match[1]);
  if (!weekday) return null;
  const rest = match[2];
  if (rest && !/libero|libera/.test(rest)) return null;
  return { weekday, free: /libero|libera/.test(rest) };
}

/**
 * Where each column's text starts. Headers are centred in their cell, the text
 * is left-aligned: for every header, the most used left edge before its centre.
 */
function columnEdges(cols: Column[], body: PdfItem[][]): void {
  const starts = new Map<number, number>();
  for (const line of body) {
    for (const item of line) {
      const x = Math.round(item.x);
      starts.set(x, (starts.get(x) ?? 0) + 1);
    }
  }
  // The most used left edge between the previous column and this header's centre.
  let previous = -Infinity;
  for (const col of cols) {
    let best: [number, number] | null = null;
    for (const [x, n] of starts) {
      if (x <= previous + 5 || x >= col.center) continue;
      if (!best || n > best[1] || (n === best[1] && x < best[0])) best = [x, n];
    }
    col.left = best ? best[0] : col.center - 40;
    previous = col.left;
  }
}

/**
 * A course starts on a line opening with a capitalised word or a number, unless
 * the previous line was left open (`… +`, `… o`, `… di`). Acronyms such as `EVO`
 * are not a capitalised word.
 */
const ENDS_OPEN =
  /(\+|,|:|\(|-|\bo|\be|\bed|\bdi|\bcon|\bda|\bin|\bal|\bdel|\bdella|\bdelle|\btra|\bsecondo|\bpiu)$/i;

export function splitCourses(lines: string[]): string[] {
  const courses: string[] = [];
  for (const text of lines) {
    const previous = courses[courses.length - 1];
    const startsNew =
      /^(\p{Lu}\p{Ll}|\d)/u.test(text) && previous !== undefined && !ENDS_OPEN.test(norm(previous));
    if (previous === undefined || startsNew) courses.push(text);
    else courses[courses.length - 1] = `${previous} ${text}`;
  }
  return courses
    .map((c) =>
      c
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.)])/g, '$1')
        .trim(),
    )
    .filter(Boolean);
}

/** Reads one day's table into the courses of each meal column. */
function readTable(cols: Column[], body: PdfItem[][]): Map<string, string[]> {
  columnEdges(cols, body);
  const perCol = new Map<string, CellLine[]>(cols.map((c) => [c.key, []]));
  for (const line of body) {
    const byCol = new Map<string, PdfItem[]>();
    for (const item of line) {
      let col = cols[0];
      for (const c of cols) if (item.x + 2 >= c.left) col = c;
      if (!byCol.has(col.key)) byCol.set(col.key, []);
      byCol.get(col.key)!.push(item);
    }
    for (const [key, items] of byCol)
      perCol.get(key)!.push({ y: items[0].y, text: lineText(items) });
  }

  const gaps: number[] = [];
  for (const lines of perCol.values()) {
    for (let i = 1; i < lines.length; i++) gaps.push(lines[i].y - lines[i - 1].y);
  }
  gaps.sort((a, b) => a - b);
  const lineGap = gaps[Math.floor(gaps.length / 2)] ?? 12;

  // Row padding in these tables is barely taller than a line break, so cells are
  // split only where a column clearly skips a line; courses come from splitCourses.
  const cells = new Map<string, string[]>();
  for (const col of cols) {
    const blocks: string[][] = [];
    let lastY = -Infinity;
    for (const line of perCol.get(col.key)!) {
      if (!blocks.length || line.y - lastY > lineGap * ROW_GAP_FACTOR) blocks.push([]);
      blocks[blocks.length - 1].push(line.text);
      lastY = line.y;
    }
    cells.set(col.key, blocks.flatMap(splitCourses));
  }
  return cells;
}

/** A trailing `(80g)` becomes the quantity, when it is the only one in the text. */
function splitQuantity(text: string): { name: string; qty: Quantity } {
  const none = { name: text, qty: { raw: '', amount: null, unit: null } };
  const all = text.match(/\d+(?:[.,]\d+)?\s*(?:g|gr|ml|kg|l)\b/gi) ?? [];
  const tail = text.match(/^(.*\S)\s*\((\d+(?:[.,]\d+)?)\s*(g|gr|ml|kg)\)\s*\.?$/i);
  if (!tail || all.length !== 1) return none;
  const unit = tail[3].toLowerCase() === 'gr' ? 'g' : tail[3].toLowerCase();
  const qty = parseQuantity(`${unit} ${tail[2]}`);
  return qty ? { name: tail[1], qty } : none;
}

/** A short label for a course, used as the table name in the app. */
function courseLabel(meal: string, text: string): string {
  const n = norm(text);
  if (/\bolio\b/.test(n)) return 'Condimento';
  if (/^\d*\s*bicchier\w* di acqua|^acqua/.test(n)) return 'Al risveglio';
  if (
    /^\d*\s*(panin|pane|frise|\d*frise|gallett|piadin|cracker|grissin|fette di pane)/.test(
      n.replace(/^\d+\s*-\s*/, ''),
    )
  )
    return 'Pane';
  if (/^(contorno|verdur|insalat|ortagg|patate)/.test(n)) return 'Contorno';
  if (/^\d*\s*(ml|g)?\s*(di )?(latte|caffe|te |the |tisana|spremuta)/.test(n)) return 'Bevanda';
  if (meal === 'Colazione' && /biscott|fette biscottate|cereali|muesli|fiocchi d'avena/.test(n))
    return 'Colazione';
  return 'Piatto';
}

/** Names the courses of one meal, making them unique: two dishes are Primo and Secondo. */
function labelCourses(meal: string, courses: string[]): string[] {
  const labels = courses.map((c) => courseLabel(meal, c));
  if (courses.length === 1 && meal !== 'Colazione') return [meal];
  const dishes = labels.filter((l) => l === 'Piatto').length;
  if (dishes === 2) {
    let seen = 0;
    for (let i = 0; i < labels.length; i++)
      if (labels[i] === 'Piatto') labels[i] = seen++ ? 'Secondo' : 'Primo';
  }
  const count = new Map<string, number>();
  return labels.map((label) => {
    const n = (count.get(label) ?? 0) + 1;
    count.set(label, n);
    return n === 1 ? label : `${label} ${n}`;
  });
}

/** `Sig. Mario Rossi` among the first lines of the document → `Mario Rossi`. */
export function patientFromLines(lines: string[]): PatientInfo {
  const title = lines.find((l) => /^(sig\.?(ra)?|signor[ae]?|dott\.?(ssa)?)\s+\S/i.test(l));
  return {
    name: title ? title.replace(/^(sig\.?(ra)?|signor[ae]?|dott\.?(ssa)?)\s+/i, '') : null,
    professional: null,
    visitDate: null,
    details: [],
  };
}

function readPatient(pages: PdfPage[]): PatientInfo {
  return patientFromLines(
    groupIntoLines(pages[0]?.items ?? [])
      .slice(0, 6)
      .map(lineText),
  );
}

/** True when the PDF lays the week out as daily tables with one column per meal. */
export function looksLikeWeeklyGrid(pages: PdfPage[]): boolean {
  let headers = 0;
  for (const page of pages) {
    for (const line of groupIntoLines(page.items)) if (headerColumns(line)) headers += 1;
  }
  return headers >= 3;
}

export function parseWeeklyGrid(pages: PdfPage[], sourceName: string): DietPlan {
  const warnings: string[] = [];
  const grids: Grid[] = [];
  let week = 1;
  let lastWeekday = 0;
  let skippedPages = 0;
  const columnsSeen = new Map<string, { name: string; order: number }>();

  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    let day: { weekday: number; free: boolean } | null = null;
    let cols: Column[] | null = null;
    let body: PdfItem[][] = [];
    let found = false;

    const flush = () => {
      if (day && cols && body.length) {
        grids.push({ week, weekday: day.weekday, free: false, cells: readTable(cols, body) });
      }
      cols = null;
      body = [];
    };

    for (const line of lines) {
      const text = lineText(line);
      const title = dayTitle(text);
      if (title) {
        flush();
        if (title.weekday <= lastWeekday) week += 1;
        lastWeekday = title.weekday;
        day = title;
        found = true;
        if (title.free) grids.push({ week, weekday: title.weekday, free: true, cells: new Map() });
        continue;
      }
      const header = headerColumns(line);
      if (header) {
        flush();
        cols = header;
        for (const c of header) columnsSeen.set(c.key, { name: c.name, order: c.order });
        continue;
      }
      if (!cols) continue;
      // Text spanning the whole table (a closing note) ends it.
      const widest = Math.max(...line.map((i) => i.w));
      if (line.length && widest > page.width * 0.45) {
        flush();
        continue;
      }
      body.push(line);
    }
    flush();
    if (!found) skippedPages += 1;
  }

  if (skippedPages) {
    warnings.push(
      `${skippedPages === 1 ? 'Una pagina' : `${skippedPages} pagine`} di note e consigli (ad esempio il pranzo fuori casa) non ${skippedPages === 1 ? 'è stata importata' : 'sono state importate'}: consultale sul PDF.`,
    );
  }
  return buildGridPlan({
    grids,
    columns: columnsSeen,
    patient: readPatient(pages),
    sourceName,
    warnings,
  });
}

/** Turns the days read from any source (PDF or Word) into the app's plan. */
export function buildGridPlan({
  grids,
  columns: columnsSeen,
  patient,
  sourceName,
  warnings,
}: {
  grids: Grid[];
  columns: Map<string, { name: string; order: number }>;
  patient: PatientInfo;
  sourceName: string;
  warnings: string[];
}): DietPlan {
  const weeks = Math.max(1, ...grids.map((g) => g.week));
  const meals = new Map<string, Meal>();

  for (const grid of grids) {
    const keys = grid.free ? [...columnsSeen.keys()] : [...grid.cells.keys()];
    for (const key of keys) {
      const meta = columnsSeen.get(key)!;
      if (!meals.has(key))
        meals.set(key, { key, name: meta.name, order: meta.order, variants: [] });
      const courses = grid.cells.get(key) ?? [];
      const labels = labelCourses(meta.name, courses);
      // A free day (e.g. «Domenica: giorno libero») holds in every week of the rotation.
      const rotating = weeks > 1 && !grid.free;
      const variantId = rotating
        ? `${key}-w${grid.week}-d${grid.weekday}`
        : `${key}-d${grid.weekday}`;
      const categories: FoodCategory[] = courses.map((course, i) => {
        const { name, qty } = splitQuantity(course);
        const id = `${variantId}-${slug(labels[i])}`;
        return {
          id,
          name: labels[i],
          section: null,
          options: [{ id: `${id}-${slug(name)}`, name, qty }],
        };
      });
      const variant: MealVariant = {
        id: variantId,
        daysLabel: `${WEEKDAY_LABELS[grid.weekday - 1]}${rotating ? ` · ${grid.week}ª settimana` : ''}`,
        days: [grid.weekday],
        categories,
        free: grid.free || !categories.length,
        ...(rotating ? { week: grid.week } : {}),
      };
      meals.get(key)!.variants.push(variant);
    }
  }

  if (!grids.length) warnings.push('Nessun pasto riconosciuto nel documento.');

  return {
    id: `${Date.now()}`,
    sourceName,
    importedAt: Date.now(),
    patient,
    meals: [...meals.values()].sort((a, b) => a.order - b.order),
    warnings,
    ...(weeks > 1 ? { weekCycle: { weeks, start: mondayOfThisWeek() } } : {}),
  };
}

/** The rotation starts with week 1 on the Monday of the import week; Piano can shift it. */
function mondayOfThisWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
