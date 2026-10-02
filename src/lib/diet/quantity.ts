import type { Quantity } from './types';

const WEIGHT_UNITS = 'g|kg|mg|ml|cl|dl|l';

/** `g 250`, `ml 200` — the unit comes first in Progeo-style plans. */
const UNIT_FIRST = new RegExp(`^(${WEIGHT_UNITS})\\s*(\\d+(?:[.,]\\d+)?)$`, 'i');
/** `1 vasetto`, `4 cucchiaini`, `2 fette`, `1 tazza`. */
const NUM_FIRST = /^(\d+(?:[.,]\d+)?)\s*(\p{L}[\p{L}\s.']*)?$/u;
/** `n° 1` — used for whole eggs and similar. */
const N_DEGREE = /^n[°ºo.]\s*(\d+(?:[.,]\d+)?)$/i;
/** Unmeasured extras such as herbs. */
const FREE = /^(quantit[aà]\s+libera|a\s+volont[aà]|q\.?\s?b\.?)$/i;

/** Parse a quantity cell, or return `null` when the text is not a quantity. */
export function parseQuantity(raw: string): Quantity | null {
  const s = raw.trim();
  if (!s) return null;

  if (FREE.test(s)) return { raw: s, amount: null, unit: null };

  const unitFirst = s.match(UNIT_FIRST);
  if (unitFirst) {
    return {
      raw: s,
      amount: Number(unitFirst[2].replace(',', '.')),
      unit: unitFirst[1].toLowerCase(),
    };
  }

  const nDeg = s.match(N_DEGREE);
  if (nDeg) return { raw: s, amount: Number(nDeg[1].replace(',', '.')), unit: 'pz' };

  const numFirst = s.match(NUM_FIRST);
  if (numFirst) {
    const unit = numFirst[2]?.trim().toLowerCase() ?? 'pz';
    // Guard against food names that merely start with a digit.
    if (unit.length > 18) return null;
    return { raw: s, amount: Number(numFirst[1].replace(',', '.')), unit };
  }

  return null;
}

export function isQuantityText(raw: string): boolean {
  return parseQuantity(raw) !== null;
}

/** Add two quantities when they share a unit; otherwise keep them apart. */
export function addQuantities(a: Quantity, b: Quantity): Quantity | null {
  if (a.unit !== b.unit) return null;
  if (a.amount === null || b.amount === null) return null;
  const total = a.amount + b.amount;
  return { raw: formatQuantity(total, a.unit), amount: total, unit: a.unit };
}

export function formatQuantity(amount: number, unit: string | null): string {
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace('.', ',');
  if (!unit) return n;
  if (/^(g|kg|mg|ml|cl|dl|l)$/i.test(unit)) return `${unit} ${n}`;
  if (unit === 'pz') return `n° ${n}`;
  return `${n} ${unit}`;
}

export function quantityLabel(q: Quantity): string {
  return q.raw;
}
