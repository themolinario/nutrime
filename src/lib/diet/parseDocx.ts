import type { DocxBlock, DocxCell } from '../docx/readDocx';
import {
  buildGridPlan,
  dayTitle,
  type Grid,
  mealColumns,
  patientFromLines,
  splitCourses,
} from './parseGrid';
import { weekdayFromName } from './text';
import type { DietPlan } from './types';

/*
 * Diet plans written in Word. Tables come with real rows and cells, so there is
 * no geometry to guess: each cell's paragraphs are its lines. Two layouts:
 *
 * - one table per day, the day's name in a paragraph above it and the meals as
 *   columns (COLAZIONE · SPUNTINO · PRANZO · …), as in the PDFs of parseGrid;
 * - one table per week with the days as columns and the meals as rows.
 *
 * A second run of the same days is the second week of a rotation.
 */

const cellText = (cell: DocxCell) => cell.join(' ').trim();

/** Days as columns, meals as rows: `| | LUNEDÌ | MARTEDÌ | … |`. */
function readTransposed(
  rows: DocxCell[][],
): {
  weekdays: number[];
  grid: Map<string, Map<number, string[]>>;
  columns: Map<string, { name: string; order: number }>;
} | null {
  const [head, ...body] = rows;
  if (!head) return null;
  const weekdays = head.slice(1).map((c) => weekdayFromName(cellText(c).split(/\s+/)[0] ?? ''));
  if (weekdays.filter(Boolean).length < 3) return null;

  const labels = body.map((row) => cellText(row[0] ?? []).toUpperCase());
  const cols = mealColumns(labels.filter(Boolean));
  if (!cols) return null;

  const grid = new Map<string, Map<number, string[]>>();
  const columns = new Map<string, { name: string; order: number }>();
  let c = 0;
  for (const row of body) {
    if (!cellText(row[0] ?? [])) continue;
    const col = cols[c++];
    columns.set(col.key, { name: col.name, order: col.order });
    row.slice(1).forEach((cell, i) => {
      const weekday = weekdays[i];
      if (!weekday) return;
      if (!grid.has(col.key)) grid.set(col.key, new Map());
      grid.get(col.key)!.set(weekday, splitCourses(cell));
    });
  }
  return { weekdays: weekdays.filter((d): d is number => d !== null), grid, columns };
}

/** True when the document holds at least one table we can read as a meal plan. */
export function looksLikeDocxPlan(blocks: DocxBlock[]): boolean {
  return blocks.some(
    (b) =>
      b.type === 'table' &&
      (b.rows.some((row) => mealColumns(row.map(cellText)) !== null) ||
        readTransposed(b.rows) !== null),
  );
}

export function parseDocxPlan(blocks: DocxBlock[], sourceName: string): DietPlan {
  const grids: Grid[] = [];
  const columns = new Map<string, { name: string; order: number }>();
  const warnings: string[] = [];
  let week = 1;
  let lastWeekday = 0;
  let day: { weekday: number; free: boolean } | null = null;
  let leftover = 0;

  const startDay = (weekday: number) => {
    if (weekday <= lastWeekday) week += 1;
    lastWeekday = weekday;
  };

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      const title = dayTitle(block.text);
      if (title) {
        startDay(title.weekday);
        day = title;
        if (title.free) grids.push({ week, weekday: title.weekday, free: true, cells: new Map() });
      } else if (grids.length) {
        leftover += 1;
      }
      continue;
    }

    // One table per week, days across.
    const transposed = readTransposed(block.rows);
    if (transposed) {
      for (const [key, meta] of transposed.columns) columns.set(key, meta);
      for (const weekday of transposed.weekdays) {
        startDay(weekday);
        const cells = new Map<string, string[]>();
        for (const [key, byDay] of transposed.grid) cells.set(key, byDay.get(weekday) ?? []);
        const free = [...cells.values()].every((c) => c.length === 1 && /liber[oa]/i.test(c[0]));
        grids.push({ week, weekday, free, cells: free ? new Map() : cells });
      }
      continue;
    }

    // One table per day: the header row names the meals; the day may also sit
    // in a merged first row of the table itself.
    let cols: ReturnType<typeof mealColumns> = null;
    const cells = new Map<string, string[]>();
    for (const row of block.rows) {
      const texts = row.map(cellText);
      if (!cols) {
        const inTable = texts.length === 1 ? dayTitle(texts[0]) : null;
        if (inTable) {
          startDay(inTable.weekday);
          day = inTable;
          continue;
        }
        cols = mealColumns(texts);
        if (cols) for (const c of cols) columns.set(c.key, { name: c.name, order: c.order });
        continue;
      }
      row.forEach((cell, i) => {
        const col = cols![i];
        if (!col) return;
        cells.set(col.key, [...(cells.get(col.key) ?? []), ...splitCourses(cell)]);
      });
    }
    if (cols && day) grids.push({ week, weekday: day.weekday, free: false, cells });
    else if (grids.length) leftover += 1;
  }

  if (leftover > 2) {
    warnings.push(
      'Note e consigli del documento (ad esempio il pranzo fuori casa) non sono stati importati: consultali sul file.',
    );
  }

  const intro = blocks
    .slice(0, 8)
    .filter((b): b is Extract<DocxBlock, { type: 'paragraph' }> => b.type === 'paragraph')
    .map((b) => b.text);
  return buildGridPlan({ grids, columns, patient: patientFromLines(intro), sourceName, warnings });
}

export const DOCX_NOT_A_PLAN =
  'Non ho trovato le tabelle dei pasti in questo documento Word. Servono tabelle con i pasti ' +
  '(Colazione, Pranzo, Cena…) e i giorni della settimana.';
