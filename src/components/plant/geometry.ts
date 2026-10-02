/**
 * The plant's drawing, in a 240 × 300 box: a pot at the bottom, a stem that
 * climbs from the soil to the flower, and the leaves hanging off it.
 */
export const BOX = { width: 240, height: 300 } as const;

type Point = { x: number; y: number };
type Cubic = [Point, Point, Point, Point];

/** Two cubic curves: a gentle S from the soil (y 224) to the flower (y 64). */
const STEM: Cubic[] = [
  [
    { x: 120, y: 224 },
    { x: 111, y: 194 },
    { x: 131, y: 170 },
    { x: 122, y: 142 },
  ],
  [
    { x: 122, y: 142 },
    { x: 113, y: 114 },
    { x: 129, y: 92 },
    { x: 120, y: 64 },
  ],
];

export const STEM_PATH = `M${STEM[0][0].x} ${STEM[0][0].y} ${STEM.map(
  ([, a, b, c]) => `C${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`,
).join(' ')}`;

function bezier([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** The stem sampled finely enough to find a point by the share of its length. */
const SAMPLES = STEM.flatMap((curve, i) =>
  Array.from({ length: 60 }, (_, k) => bezier(curve, (k + (i === 0 ? 0 : 1)) / 60)),
);
SAMPLES.unshift(STEM[0][0]);
const LENGTHS = SAMPLES.map((p, i) =>
  i === 0 ? 0 : Math.hypot(p.x - SAMPLES[i - 1].x, p.y - SAMPLES[i - 1].y),
).reduce<number[]>((acc, d, i) => [...acc, (acc[i - 1] ?? 0) + d], []);

export const STEM_LENGTH = LENGTHS[LENGTHS.length - 1];

/** The point `share` (0–1) of the way up the stem. */
export function stemPoint(share: number): Point {
  const target = share * STEM_LENGTH;
  const i = Math.max(1, LENGTHS.findIndex((l) => l >= target));
  const span = LENGTHS[i] - LENGTHS[i - 1] || 1;
  const t = (target - LENGTHS[i - 1]) / span;
  return {
    x: SAMPLES[i - 1].x + (SAMPLES[i].x - SAMPLES[i - 1].x) * t,
    y: SAMPLES[i - 1].y + (SAMPLES[i].y - SAMPLES[i - 1].y) * t,
  };
}

/** How much of the stem shows at each growth stage, from bare soil to flower. */
export const STEM_BY_STAGE = [0, 0.24, 0.44, 0.64, 0.84, 1];

export type LeafSlot = {
  /** Share of the stem where it grows. */
  at: number;
  side: 1 | -1;
  /** Length in box units. */
  size: number;
  /** Growth stage that brings it out. */
  stage: number;
};

export const LEAVES: LeafSlot[] = [
  { at: 0.22, side: -1, size: 30, stage: 1 },
  { at: 0.22, side: 1, size: 30, stage: 1 },
  { at: 0.38, side: 1, size: 48, stage: 2 },
  { at: 0.43, side: -1, size: 44, stage: 2 },
  { at: 0.58, side: -1, size: 46, stage: 3 },
  { at: 0.63, side: 1, size: 42, stage: 3 },
  { at: 0.78, side: 1, size: 36, stage: 4 },
  { at: 0.82, side: -1, size: 32, stage: 4 },
];

export const TOP = stemPoint(1);
