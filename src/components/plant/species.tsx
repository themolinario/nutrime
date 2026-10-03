import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { SpeciesId } from '../../lib/garden';

/**
 * What each plant looks like, in one cartoon style (flat fills, a dark ink
 * outline, a white highlight) but each with its own body: a patch of sprouts,
 * a round bush, a tall sunflower, a little olive tree in a bonsai tray.
 *
 * A plant is a list of parts in a 240 × 300 box, the soil at y 216. Each part
 * pops in at a growth stage (1 sprout … 4 bud, 5 grown) from its origin, and
 * may keep growing until a later stage or fade once something replaces it.
 */

export const INK = '#2B2A1F';
const DRY_TONE = '#B48A58';

/** A colour turned to dry straw, keeping a hint of what it was. */
export function dried(color: string): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const from = parse(color);
  const to = parse(DRY_TONE);
  return `#${from
    .map((v, i) => Math.round(v * 0.3 + to[i] * 0.7).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Paints: identity while healthy, {@link dried} once the plant dries out. */
export type Paint = (color: string) => string;
export const paintFor = (dry: boolean): Paint => (dry ? dried : (c) => c);

export type Part = {
  stage: number;
  /** Keeps growing until this stage, starting from a third of its size. */
  stretch?: number;
  /** Fades away from this stage, replaced by what comes next. */
  until?: number;
  /** Grows upward only, like a stem. */
  upright?: boolean;
  /** Where it grows from, in the box. */
  origin: [number, number];
  /** Degrees it leans with the breeze. */
  sway?: number;
  /** Drawn in front of the pot, like fruits hanging over its rim. */
  front?: boolean;
  draw: (p: Paint, alive: boolean) => ReactNode;
};

/** How big a part is at `grow`; 0 while it hasn't come out yet. */
export function partScale(grow: number, stage: number, stretch: number): number {
  'worklet';
  const appear = Math.min(1, Math.max(0, (grow - stage + 0.6) / 0.6));
  if (appear <= 0) return 0;
  const c1 = 2.1;
  const q = appear - 1;
  let s = 1 + (c1 + 1) * q * q * q + c1 * q * q;
  if (stretch > stage) s *= 0.35 + 0.65 * Math.min(1, Math.max(0, (grow - stage) / (stretch - stage)));
  return s;
}

/* ── Pots ──────────────────────────────────────────────────────────────── */

export type Pot = {
  body: string;
  rim: { x: number; y: number; w: number; h: number };
  /** Top of the eyes; the mouth and cheeks follow. */
  face: number;
  shadow: { cy: number; rx: number };
  shine?: string;
  /** Planks, feet: drawn before the body for feet, after it for the rest. */
  under?: ReactNode;
  over?: ReactNode;
  /** Lowest point of the drawing. */
  bottom: number;
};

export const POTS = {
  classic: {
    body: 'M70 234 L170 234 L158 288 Q156 294 150 294 L90 294 Q84 294 82 288 Z',
    rim: { x: 60, y: 212, w: 120, h: 26 },
    face: 248,
    shadow: { cy: 296, rx: 62 },
    shine: 'M84 242 L92 284',
    bottom: 302,
  },
  bowl: {
    body: 'M54 232 L186 232 Q184 268 154 284 L86 284 Q56 268 54 232 Z',
    rim: { x: 46, y: 210, w: 148, h: 24 },
    face: 242,
    shadow: { cy: 288, rx: 74 },
    shine: 'M68 244 Q72 262 86 274',
    bottom: 294,
  },
  round: {
    body: 'M80 232 L160 232 Q192 252 170 284 Q164 294 150 294 L90 294 Q76 294 70 284 Q48 252 80 232 Z',
    rim: { x: 68, y: 212, w: 104, h: 24 },
    face: 250,
    shadow: { cy: 296, rx: 60 },
    shine: 'M68 254 Q68 270 78 282',
    bottom: 302,
  },
  crate: {
    body: 'M64 232 L176 232 L176 290 Q176 294 172 294 L68 294 Q64 294 64 290 Z',
    rim: { x: 58, y: 212, w: 124, h: 22 },
    face: 250,
    shadow: { cy: 297, rx: 66 },
    over: (
      <>
        <Path d="M64 274 L176 274" stroke={INK} strokeWidth={2} opacity={0.3} />
        {[
          [72, 240],
          [168, 240],
          [72, 284],
          [168, 284],
        ].map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.8} fill={INK} opacity={0.45} />
        ))}
      </>
    ),
    bottom: 302,
  },
  tray: {
    body: 'M44 230 L196 230 L188 262 Q186 268 178 268 L62 268 Q54 268 52 262 Z',
    rim: { x: 36, y: 212, w: 168, h: 22 },
    face: 236,
    shadow: { cy: 278, rx: 88 },
    shine: 'M58 238 L63 258',
    under: (
      <>
        <Rect x={62} y={262} width={20} height={12} rx={3} fill="#5E6E80" stroke={INK} strokeWidth={3} />
        <Rect x={158} y={262} width={20} height={12} rx={3} fill="#5E6E80" stroke={INK} strokeWidth={3} />
      </>
    ),
    bottom: 284,
  },
} satisfies Record<string, Pot>;

/* ── Drawing kit ───────────────────────────────────────────────────────── */

type Colors = { fill: string; shade: string; light?: string };

const leafBody = (x: number, y: number, l: number, w: number) =>
  `M${x} ${y} C ${x - w} ${y - l * 0.3}, ${x - w * 0.75} ${y - l * 0.85}, ${x} ${y - l} C ${x + w * 0.75} ${y - l * 0.85}, ${x + w} ${y - l * 0.3}, ${x} ${y} Z`;
const leafHalf = (x: number, y: number, l: number, w: number) =>
  `M${x} ${y} L${x} ${y - l} C ${x + w * 0.75} ${y - l * 0.85}, ${x + w} ${y - l * 0.3}, ${x} ${y} Z`;

/** A leaf from (x, y), turned `a` degrees from upright, on an optional bare stalk. */
function Leaf({
  x,
  y,
  a,
  l,
  w,
  c,
  p,
  stalk = 0,
  stalkColor,
}: {
  x: number;
  y: number;
  a: number;
  l: number;
  w: number;
  c: Colors;
  p: Paint;
  stalk?: number;
  stalkColor?: string;
}) {
  const by = y - stalk;
  return (
    <G transform={`rotate(${a} ${x} ${y})`}>
      {stalk ? (
        <>
          <Path d={`M${x} ${y} L${x} ${by + 2}`} stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
          <Path
            d={`M${x} ${y} L${x} ${by + 2}`}
            stroke={p(stalkColor ?? c.shade)}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </>
      ) : null}
      <Path d={leafBody(x, by, l, w)} fill={p(c.fill)} />
      <Path d={leafHalf(x, by, l, w)} fill={p(c.shade)} />
      <Path
        d={`M${x} ${by - 2} L${x} ${by - l * 0.82}`}
        stroke={INK}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path d={leafBody(x, by, l, w)} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" fill="none" />
      <Ellipse
        cx={x - w * 0.38}
        cy={by - l * 0.55}
        rx={Math.max(1.2, w * 0.13)}
        ry={l * 0.12}
        fill="#FFFFFF"
        opacity={0.4}
      />
    </G>
  );
}

/** A stem or branch: an ink line with a coloured one inside. */
function Stalk({ d, w, color, p }: { d: string; w: number; color: string; p: Paint }) {
  return (
    <>
      <Path d={d} stroke={INK} strokeWidth={w + 4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={p(color)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

/** A round mass of foliage, with a lighter top and a few leaf marks. */
function Blob({
  cx,
  cy,
  rx,
  ry,
  c,
  p,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  c: Colors;
  p: Paint;
}) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p(c.fill)} stroke={INK} strokeWidth={2.6} />
      <Ellipse cx={cx - rx * 0.12} cy={cy - ry * 0.22} rx={rx * 0.72} ry={ry * 0.55} fill={p(c.light ?? c.fill)} />
      <Path
        d={`M${cx - rx * 0.45} ${cy + ry * 0.2} q 4 -5 8 0 M${cx + rx * 0.1} ${cy - ry * 0.35} q 4 -5 8 0 M${cx + rx * 0.3} ${cy + ry * 0.35} q 4 -5 8 0`}
        stroke={p(c.shade)}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx={cx - rx * 0.45} cy={cy - ry * 0.45} rx={rx * 0.14} ry={ry * 0.12} fill="#FFFFFF" opacity={0.45} />
    </G>
  );
}

/** Eyes, smile and cheeks, scaled by `s` (1 suits a 15-point flower centre); a flat line once dried. */
function Face({ x, y, s, alive }: { x: number; y: number; s: number; alive: boolean }) {
  if (!alive) {
    return (
      <Path
        d={`M${x - 5 * s} ${y + 6 * s} Q ${x} ${y + 2 * s} ${x + 5 * s} ${y + 6 * s}`}
        stroke={INK}
        strokeWidth={2 * s}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <>
      <Ellipse cx={x - 5 * s} cy={y - 2 * s} rx={2 * s} ry={2.8 * s} fill={INK} />
      <Ellipse cx={x + 5 * s} cy={y - 2 * s} rx={2 * s} ry={2.8 * s} fill={INK} />
      <Path
        d={`M${x - 5 * s} ${y + 4 * s} Q ${x} ${y + 9 * s} ${x + 5 * s} ${y + 4 * s}`}
        stroke={INK}
        strokeWidth={2 * s}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={x - 10 * s} cy={y + 4 * s} r={2.6 * s} fill="#FF7A8A" opacity={0.55} />
      <Circle cx={x + 10 * s} cy={y + 4 * s} r={2.6 * s} fill="#FF7A8A" opacity={0.55} />
    </>
  );
}

/** A flower with round petals around a centre of radius `r * 0.4`. */
function Daisy({
  x,
  y,
  r,
  n,
  petal,
  light,
  center,
  p,
  alive,
  face = false,
}: {
  x: number;
  y: number;
  r: number;
  n: number;
  petal: string;
  light?: string;
  center: string;
  p: Paint;
  alive: boolean;
  face?: boolean;
}) {
  const ring = (offset: number, scale: number, color: string) =>
    Array.from({ length: n }, (_, i) => (
      <Ellipse
        key={`${offset}-${i}`}
        cx={x}
        cy={y - r * 0.62 * scale}
        rx={r * (n > 8 ? 0.17 : 0.3) * scale}
        ry={r * 0.4 * scale}
        fill={p(color)}
        stroke={INK}
        strokeWidth={2}
        transform={`rotate(${(i * 360) / n + offset} ${x} ${y})`}
      />
    ));
  return (
    <G>
      {ring(0, 1, petal)}
      {light ? ring(180 / n, 0.78, light) : null}
      <Circle cx={x} cy={y} r={r * 0.4} fill={p(center)} stroke={INK} strokeWidth={2.2} />
      {face ? <Face x={x} y={y} s={(r * 0.4) / 15} alive={alive} /> : null}
    </G>
  );
}

/** A tiny flower of four or five round petals. */
function Blossom({ x, y, r, color, p }: { x: number; y: number; r: number; color: string; p: Paint }) {
  return (
    <G>
      {[0, 72, 144, 216, 288].map((deg) => (
        <Circle
          key={deg}
          cx={x + r * Math.cos((deg * Math.PI) / 180)}
          cy={y + r * Math.sin((deg * Math.PI) / 180)}
          r={r * 0.85}
          fill={p(color)}
          stroke={INK}
          strokeWidth={1.4}
        />
      ))}
      <Circle cx={x} cy={y} r={r * 0.55} fill={p('#FFD23F')} />
    </G>
  );
}

/** Fruits, drawn in a 26-point box hanging from (x, y), scaled by `s`. */
function Hang({ x, y, s = 1, children }: { x: number; y: number; s?: number; children: ReactNode }) {
  return <G transform={`translate(${x - 13 * s} ${y}) scale(${s})`}>{children}</G>;
}

function Strawberry({ x, y, s, p }: { x: number; y: number; s?: number; p: Paint }) {
  return (
    <Hang x={x} y={y} s={s}>
      <Path
        d="M13 5 C 22 4, 25 11, 20 18 C 17 22, 15 25, 13 25 C 11 25, 9 22, 6 18 C 1 11, 4 4, 13 5 Z"
        fill={p('#FF4D5E')}
        stroke={INK}
        strokeWidth={1.8}
      />
      {[
        [9, 11],
        [15, 10],
        [12, 16],
        [17, 15],
        [8, 16],
        [13, 21],
      ].map(([cx, cy]) => (
        <Ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={0.9} ry={1.3} fill={p('#FFE27A')} />
      ))}
      <Path d="M7 5 L13 8 L19 5 L15 3 L13 0 L11 3 Z" fill={p('#58A83A')} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <Ellipse cx={8.5} cy={9} rx={1.6} ry={2.8} fill="#FFFFFF" opacity={0.55} />
    </Hang>
  );
}

function Chili({ x, y, s, color = '#E8322B', p }: { x: number; y: number; s?: number; color?: string; p: Paint }) {
  return (
    <Hang x={x} y={y} s={s}>
      <Path
        d="M10 5 C 16 4, 18 8, 17 13 C 16 18, 13 23, 9 25 C 10 20, 9 13, 8 9 C 7.5 7, 8 5.5, 10 5 Z"
        fill={p(color)}
        stroke={INK}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M9 5 C 11 2, 14 2, 16 5 Z" fill={p('#58A83A')} stroke={INK} strokeWidth={1.4} />
      <Path d="M12.5 3 L12 0" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Ellipse cx={11.5} cy={10} rx={1.2} ry={3} fill="#FFFFFF" opacity={0.55} />
    </Hang>
  );
}

function Tomato({ x, y, s, p }: { x: number; y: number; s?: number; p: Paint }) {
  return (
    <Hang x={x} y={y} s={s}>
      <Circle cx={13} cy={15} r={9.5} fill={p('#F2402F')} stroke={INK} strokeWidth={1.8} />
      <Path
        d="M7 8 L11 9 L13 5 L15 9 L19 8 L16 11 L13 10 L10 11 Z"
        fill={p('#58A83A')}
        stroke={INK}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <Path d="M13 5 L13 1" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Ellipse cx={9} cy={13} rx={2} ry={3} fill="#FFFFFF" opacity={0.5} />
    </Hang>
  );
}

function Olive({ x, y, s, color, p }: { x: number; y: number; s?: number; color: string; p: Paint }) {
  return (
    <Hang x={x} y={y} s={s}>
      <Path d="M13 0 L13 6" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Ellipse cx={13} cy={13} rx={5.5} ry={7} fill={p(color)} stroke={INK} strokeWidth={1.7} />
      <Ellipse cx={11.2} cy={10.5} rx={1.3} ry={2.2} fill="#FFFFFF" opacity={0.5} />
    </Hang>
  );
}

/** A star-shaped yellow flower, like the tomato's. */
function Star({ x, y, r, p }: { x: number; y: number; r: number; p: Paint }) {
  return (
    <G>
      {Array.from({ length: 5 }, (_, i) => (
        <Path
          key={i}
          transform={`rotate(${i * 72} ${x} ${y})`}
          d={`M${x} ${y} C ${x - r * 0.45} ${y - r * 0.5}, ${x - r * 0.2} ${y - r}, ${x} ${y - r * 1.1} C ${x + r * 0.2} ${y - r}, ${x + r * 0.45} ${y - r * 0.5}, ${x} ${y} Z`}
          fill={p('#FFD23F')}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      ))}
      <Circle cx={x} cy={y} r={r * 0.3} fill={p('#F2A516')} stroke={INK} strokeWidth={1.2} />
    </G>
  );
}

/* ── The plants ────────────────────────────────────────────────────────── */

export type Look = {
  pot: Pot;
  colors: { body: string; rim: string };
  parts: Part[];
  /** Highest point of the drawing at each stage, 0 to 5, for fitting it in a slot. */
  tops: [number, number, number, number, number, number];
  /** Centre of the glow and the confetti once grown. */
  glow: { x: number; y: number };
};

const GROUND = 216;

/* Crescione: a dense patch of sprouts, each with its pair of round leaves. */

const CRESS = { fill: '#86D45C', shade: '#5DAF3B' };

function cressRow(sprouts: [number, number, number][], p: Paint, flowers = false) {
  return sprouts.map(([x, h, lean]) => {
    const tx = x + lean;
    const ty = GROUND - h;
    return (
      <G key={`${x}-${h}`}>
        <Stalk d={`M${x} ${GROUND} Q ${x + lean * 0.2} ${GROUND - h * 0.5} ${tx} ${ty}`} w={2.6} color="#CDEBB0" p={p} />
        {flowers ? (
          <>
            <Stalk d={`M${tx} ${ty} L${tx} ${ty - 14}`} w={2} color="#CDEBB0" p={p} />
            <Blossom x={tx} y={ty - 16} r={3.6} color="#FFFFFF" p={p} />
          </>
        ) : (
          <>
            <Leaf x={tx} y={ty} a={-62} l={17} w={8} c={CRESS} p={p} />
            <Leaf x={tx} y={ty} a={62} l={17} w={8} c={CRESS} p={p} />
          </>
        )}
      </G>
    );
  });
}

const CRESS_BACK: [number, number, number][] = [
  [90, 72, -4],
  [108, 80, -2],
  [130, 78, 2],
  [150, 70, 4],
];

const crescione: Look = {
  pot: POTS.bowl,
  colors: { body: '#6FB7E0', rim: '#8ECCEE' },
  parts: [
    { stage: 4, origin: [120, GROUND], sway: 2, draw: (p) => cressRow(CRESS_BACK, p) },
    {
      stage: 3,
      origin: [120, GROUND],
      sway: 2,
      draw: (p) =>
        cressRow(
          [
            [80, 52, -6],
            [100, 60, -2],
            [120, 64, 0],
            [140, 58, 3],
            [160, 48, 6],
          ],
          p,
        ),
    },
    {
      stage: 2,
      origin: [120, GROUND],
      sway: 1.5,
      draw: (p) =>
        cressRow(
          [
            [96, 38, -3],
            [114, 44, -1],
            [132, 42, 2],
            [150, 34, 4],
          ],
          p,
        ),
    },
    { stage: 1, origin: [120, GROUND], sway: 1, draw: (p) => cressRow([[122, 24, 0]], p) },
    { stage: 5, origin: [120, 140], sway: 2, draw: (p) => cressRow(CRESS_BACK.map(([x, h, l]) => [x, h + 4, l]), p, true) },
  ],
  tops: [207, 182, 164, 144, 128, 112],
  glow: { x: 120, y: 160 },
};

/* Ravanello: a rosette of leaves on red stalks, over a fat red root. */

const RADISH_LEAF = { fill: '#6CC04A', shade: '#3F8A2C' };
const radishLeaves = (leaves: [number, number, number, number][]) => (p: Paint) =>
  leaves.map(([a, stalk, l, w]) => (
    <Leaf key={a} x={120} y={196} a={a} l={l} w={w} stalk={stalk} stalkColor="#D2506E" c={RADISH_LEAF} p={p} />
  ));

const ravanello: Look = {
  pot: POTS.classic,
  colors: { body: '#E57A4E', rim: '#F29063' },
  parts: [
    {
      stage: 4,
      origin: [120, 196],
      sway: 3,
      draw: radishLeaves([
        [0, 32, 52, 21],
        [-74, 14, 34, 13],
        [74, 14, 34, 13],
      ]),
    },
    {
      stage: 3,
      origin: [120, 196],
      sway: 2.5,
      draw: radishLeaves([
        [-20, 26, 48, 19],
        [20, 26, 48, 19],
      ]),
    },
    {
      stage: 2,
      origin: [120, 196],
      sway: 2,
      draw: radishLeaves([
        [-48, 18, 36, 15],
        [48, 18, 36, 15],
      ]),
    },
    {
      stage: 1,
      origin: [120, 196],
      sway: 1,
      draw: radishLeaves([
        [-22, 10, 22, 9],
        [22, 10, 22, 9],
      ]),
    },
    {
      stage: 2,
      stretch: 5,
      origin: [120, GROUND],
      front: true,
      draw: (p) => (
        <G>
          <Path
            d="M120 174 C 146 174, 152 196, 141 208 C 135 214, 127 217, 120 217 C 113 217, 105 214, 99 208 C 88 196, 94 174, 120 174 Z"
            fill={p('#E8395A')}
            stroke={INK}
            strokeWidth={3}
          />
          <Path d="M112 176 C 116 172, 124 172, 128 176" stroke={p('#B8243F')} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Ellipse cx={107} cy={188} rx={4} ry={7} fill="#FFFFFF" opacity={0.5} />
          <Circle cx={134} cy={200} r={1.6} fill="#FFFFFF" opacity={0.6} />
          <Circle cx={128} cy={207} r={1.2} fill="#FFFFFF" opacity={0.6} />
        </G>
      ),
    },
  ],
  tops: [207, 172, 156, 128, 110, 110],
  glow: { x: 120, y: 160 },
};

/* Basilico: a round bush of big cupped leaves in pairs, flower spikes on top. */

const BASIL = { fill: '#4FB548', shade: '#2F7F2E' };
function basilPair(y: number, a: number, l: number, w: number) {
  return (p: Paint) => [-a, a].map((angle) => (
    <Leaf key={angle} x={120} y={y} a={angle} l={l} w={w} c={BASIL} p={p} />
  ));
}

function BasilSpike({ x, y, top, p }: { x: number; y: number; top: number; p: Paint }) {
  const tiers = 4;
  return (
    <G>
      <Stalk d={`M${x} ${y} L${x + (top - y) * 0.0} ${top}`} w={2.6} color="#4E9A3A" p={p} />
      {Array.from({ length: tiers }, (_, i) => {
        const ty = top + 4 + i * ((y - top - 8) / tiers);
        return (
          <G key={i}>
            <Ellipse cx={x - 4} cy={ty} rx={3.6} ry={2.8} fill={p('#FFFFFF')} stroke={INK} strokeWidth={1.4} />
            <Ellipse cx={x + 4} cy={ty + 2} rx={3.6} ry={2.8} fill={p('#EBDDFB')} stroke={INK} strokeWidth={1.4} />
          </G>
        );
      })}
    </G>
  );
}

const basilico: Look = {
  pot: POTS.round,
  colors: { body: '#D9C27A', rim: '#E8D595' },
  parts: [
    {
      stage: 1,
      stretch: 4,
      upright: true,
      origin: [120, GROUND],
      draw: (p) => <Stalk d="M120 216 L120 140" w={5} color="#4E9A3A" p={p} />,
    },
    { stage: 1, origin: [120, 204], sway: 1, draw: basilPair(204, 58, 22, 12) },
    { stage: 2, origin: [120, 190], sway: 1.5, draw: basilPair(190, 68, 42, 24) },
    { stage: 3, origin: [120, 170], sway: 2, draw: basilPair(170, 52, 48, 27) },
    {
      stage: 4,
      origin: [120, 150],
      sway: 2.5,
      draw: (p) => (
        <>
          {basilPair(152, 34, 48, 26)(p)}
          {basilPair(142, 12, 42, 22)(p)}
        </>
      ),
    },
    {
      stage: 5,
      origin: [120, 110],
      sway: 3,
      draw: (p) => (
        <>
          <BasilSpike x={102} y={112} top={78} p={p} />
          <BasilSpike x={138} y={112} top={80} p={p} />
          <BasilSpike x={120} y={104} top={62} p={p} />
        </>
      ),
    },
  ],
  tops: [207, 186, 160, 130, 98, 62],
  glow: { x: 120, y: 130 },
};

/* Calendula: a clump of long leaves and three orange flowers on stalks. */

const CALENDULA_LEAF = { fill: '#7BCB52', shade: '#58A83A' };
const calendulaLeaves = (leaves: [number, number, number][]) => (p: Paint) =>
  leaves.map(([a, l, w]) => <Leaf key={a} x={120} y={GROUND} a={a} l={l} w={w} c={CALENDULA_LEAF} p={p} />);
const CALENDULA_TIPS: [number, number, number][] = [
  [120, 90, 30],
  [80, 116, 21],
  [162, 106, 21],
];

const calendula: Look = {
  pot: POTS.classic,
  colors: { body: '#F2C14E', rim: '#F7D47A' },
  parts: [
    {
      stage: 2,
      stretch: 4,
      upright: true,
      origin: [120, GROUND],
      draw: (p) => <Stalk d="M120 214 C 117 170, 124 130, 120 92" w={4.5} color="#58A83A" p={p} />,
    },
    {
      stage: 3,
      origin: [120, 204],
      sway: 2,
      draw: (p) => (
        <>
          <Stalk d="M118 204 C 104 170, 92 140, 80 118" w={4} color="#58A83A" p={p} />
          <Stalk d="M122 204 C 138 168, 152 136, 162 108" w={4} color="#58A83A" p={p} />
        </>
      ),
    },
    {
      stage: 3,
      origin: [120, GROUND],
      sway: 1.5,
      draw: calendulaLeaves([
        [-68, 46, 12],
        [68, 46, 12],
        [-28, 54, 14],
        [28, 54, 14],
      ]),
    },
    {
      stage: 2,
      origin: [120, GROUND],
      sway: 1,
      draw: calendulaLeaves([
        [-44, 44, 12],
        [44, 44, 12],
      ]),
    },
    {
      stage: 1,
      origin: [120, GROUND],
      draw: calendulaLeaves([
        [-16, 30, 9],
        [16, 30, 9],
      ]),
    },
    {
      stage: 4,
      until: 5,
      origin: [120, 100],
      sway: 2,
      draw: (p) =>
        CALENDULA_TIPS.map(([x, y]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y - 4} rx={8} ry={10} fill={p('#7BCB52')} stroke={INK} strokeWidth={2.2} />
            <Path d={`M${x - 4} ${y - 10} Q ${x} ${y - 16} ${x + 4} ${y - 10}`} stroke={p('#FF9A1F')} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          </G>
        )),
    },
    {
      stage: 5,
      origin: [120, 100],
      sway: 2,
      draw: (p, alive) =>
        CALENDULA_TIPS.map(([x, y, r], i) => (
          <Daisy
            key={x}
            x={x}
            y={y}
            r={r}
            n={i === 0 ? 14 : 12}
            petal="#FF9A1F"
            light="#FFC24A"
            center="#C85A12"
            face={i === 0}
            p={p}
            alive={alive}
          />
        )),
    },
  ],
  tops: [207, 184, 164, 150, 84, 58],
  glow: { x: 120, y: 100 },
};

/* Fragola: a low mound of three-part leaves, runners spilling over the pot. */

const STRAWBERRY_LEAF = { fill: '#6DBE45', shade: '#4A9A2E' };

function Trifoliate({ a, l, r, p }: { a: number; l: number; r: number; p: Paint }) {
  const x = 120;
  const y = GROUND;
  return (
    <G transform={`rotate(${a} ${x} ${y})`}>
      <Stalk d={`M${x} ${y} Q ${x + 3} ${y - l * 0.5} ${x} ${y - l}`} w={2.6} color="#4A9A2E" p={p} />
      <Leaf x={x} y={y - l} a={-50} l={r * 2} w={r * 0.95} c={STRAWBERRY_LEAF} p={p} />
      <Leaf x={x} y={y - l} a={50} l={r * 2} w={r * 0.95} c={STRAWBERRY_LEAF} p={p} />
      <Leaf x={x} y={y - l} a={0} l={r * 2.2} w={r} c={STRAWBERRY_LEAF} p={p} />
    </G>
  );
}

const fragola: Look = {
  pot: POTS.round,
  colors: { body: '#F4A6B8', rim: '#F8C2CF' },
  parts: [
    {
      stage: 3,
      origin: [120, GROUND],
      sway: 2,
      draw: (p) => (
        <>
          <Trifoliate a={-66} l={30} r={10} p={p} />
          <Trifoliate a={66} l={30} r={10} p={p} />
          <Trifoliate a={-14} l={52} r={13} p={p} />
          <Trifoliate a={18} l={48} r={13} p={p} />
        </>
      ),
    },
    {
      stage: 2,
      origin: [120, GROUND],
      sway: 1.5,
      draw: (p) => (
        <>
          <Trifoliate a={-38} l={34} r={11} p={p} />
          <Trifoliate a={38} l={34} r={11} p={p} />
        </>
      ),
    },
    { stage: 1, origin: [120, GROUND], draw: (p) => <Trifoliate a={0} l={18} r={8} p={p} /> },
    {
      stage: 4,
      origin: [120, 160],
      sway: 2,
      draw: (p, alive) => (
        <>
          <Daisy x={92} y={172} r={11} n={5} petal="#FFFFFF" center="#FFD23F" p={p} alive={alive} />
          <Daisy x={150} y={168} r={11} n={5} petal="#FFFFFF" center="#FFD23F" p={p} alive={alive} />
          <Daisy x={122} y={128} r={16} n={5} petal="#FFFFFF" center="#FFD23F" face p={p} alive={alive} />
        </>
      ),
    },
    {
      stage: 4,
      origin: [120, 208],
      front: true,
      draw: (p) => (
        <>
          <Stalk d="M106 210 C 88 202, 70 208, 62 228" w={2.6} color="#4A9A2E" p={p} />
          <Stalk d="M134 210 C 152 202, 170 208, 178 230" w={2.6} color="#4A9A2E" p={p} />
          <Leaf x={82} y={206} a={-30} l={16} w={8} c={STRAWBERRY_LEAF} p={p} />
          <Leaf x={158} y={206} a={30} l={16} w={8} c={STRAWBERRY_LEAF} p={p} />
        </>
      ),
    },
    {
      stage: 5,
      origin: [120, 210],
      front: true,
      sway: 2,
      draw: (p) => (
        <>
          <Strawberry x={62} y={226} s={1.2} p={p} />
          <Strawberry x={178} y={228} s={1.2} p={p} />
          <Strawberry x={102} y={182} s={1} p={p} />
          <Strawberry x={142} y={184} s={1} p={p} />
        </>
      ),
    },
  ],
  tops: [207, 184, 166, 140, 110, 110],
  glow: { x: 120, y: 160 },
};

/* Girasole: one tall thick stem, broad leaves, a huge smiling head. */

const SUNFLOWER_LEAF = { fill: '#74C24C', shade: '#4E9B31' };
const sunLeaves = (leaves: [number, number, number, number][]) => (p: Paint) =>
  leaves.map(([y, a, l, w]) => (
    <Leaf key={`${y}${a}`} x={120} y={y} a={a} l={l} w={w} stalk={8} c={SUNFLOWER_LEAF} p={p} />
  ));

const girasole: Look = {
  pot: POTS.classic,
  colors: { body: '#5C8FD6', rim: '#7BA8E6' },
  parts: [
    {
      stage: 1,
      stretch: 4,
      upright: true,
      origin: [120, GROUND],
      draw: (p) => <Stalk d="M120 216 C 115 170, 125 120, 120 70" w={8} color="#5FA83A" p={p} />,
    },
    {
      stage: 1,
      origin: [120, 192],
      sway: 1,
      draw: sunLeaves([
        [192, -60, 22, 13],
        [192, 60, 22, 13],
      ]),
    },
    {
      stage: 2,
      origin: [120, 176],
      sway: 1.5,
      draw: sunLeaves([
        [178, -72, 50, 30],
        [172, 70, 46, 28],
      ]),
    },
    {
      stage: 3,
      origin: [120, 136],
      sway: 2,
      draw: sunLeaves([
        [140, 64, 48, 28],
        [132, -62, 46, 27],
      ]),
    },
    {
      stage: 4,
      origin: [120, 104],
      sway: 2,
      draw: sunLeaves([
        [104, -52, 36, 21],
        [104, 52, 36, 21],
      ]),
    },
    {
      stage: 4,
      until: 5,
      origin: [120, 72],
      sway: 2,
      draw: (p) => (
        <G>
          {Array.from({ length: 8 }, (_, i) => (
            <Path
              key={i}
              transform={`rotate(${i * 45} 120 66)`}
              d="M114 58 L120 44 L126 58 Z"
              fill={p('#5FA83A')}
              stroke={INK}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
          <Circle cx={120} cy={66} r={13} fill={p('#74C24C')} stroke={INK} strokeWidth={2.4} />
          <Path d="M113 60 Q 120 54 127 60" stroke={p('#FFC21A')} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      ),
    },
    {
      stage: 5,
      origin: [120, 70],
      sway: 2,
      draw: (p, alive) => (
        <G>
          {Array.from({ length: 20 }, (_, i) => (
            <Path
              key={i}
              transform={`rotate(${i * 18} 120 62)`}
              d="M120 40 C 112 30, 116 18, 120 10 C 124 18, 128 30, 120 40 Z"
              fill={p(i % 2 ? '#FFC21A' : '#FFD84A')}
              stroke={INK}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          ))}
          <Circle cx={120} cy={62} r={25} fill={p('#7A4A21')} stroke={INK} strokeWidth={2.8} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI * 2) / 12;
            return <Circle key={i} cx={120 + Math.cos(a) * 19} cy={62 + Math.sin(a) * 19} r={1.7} fill={p('#4A2A10')} />;
          })}
          <Circle cx={120} cy={62} r={15} fill={p('#94602E')} />
          <Face x={120} y={62} s={1.05} alive={alive} />
        </G>
      ),
    },
  ],
  tops: [207, 170, 132, 104, 48, 8],
  glow: { x: 120, y: 62 },
};

/* Peperoncino: a little tree, a short trunk under a round crown full of chillies. */

const BUSH = { fill: '#5DB443', shade: '#3C8A2B', light: '#7ED061' };

const peperoncino: Look = {
  pot: POTS.classic,
  colors: { body: '#3F9E6E', rim: '#5DB887' },
  parts: [
    {
      stage: 1,
      stretch: 3,
      upright: true,
      origin: [120, GROUND],
      draw: (p) => <Stalk d="M120 216 C 117 192, 123 172, 120 150" w={7} color="#7A8F45" p={p} />,
    },
    {
      stage: 3,
      origin: [120, 170],
      draw: (p) => (
        <>
          <Stalk d="M120 174 C 112 164, 102 156, 94 146" w={5} color="#7A8F45" p={p} />
          <Stalk d="M120 170 C 128 162, 138 154, 146 144" w={5} color="#7A8F45" p={p} />
        </>
      ),
    },
    {
      stage: 4,
      origin: [120, 130],
      sway: 2,
      draw: (p) => (
        <>
          <Blob cx={104} cy={112} rx={22} ry={18} c={BUSH} p={p} />
          <Blob cx={138} cy={110} rx={22} ry={18} c={BUSH} p={p} />
        </>
      ),
    },
    {
      stage: 3,
      origin: [120, 150],
      sway: 1.5,
      draw: (p) => (
        <>
          <Blob cx={120} cy={128} rx={32} ry={24} c={BUSH} p={p} />
          <Blob cx={92} cy={146} rx={24} ry={20} c={BUSH} p={p} />
          <Blob cx={148} cy={144} rx={24} ry={20} c={BUSH} p={p} />
        </>
      ),
    },
    { stage: 2, origin: [120, 170], sway: 1, draw: (p) => <Blob cx={120} cy={152} rx={30} ry={22} c={BUSH} p={p} /> },
    {
      stage: 1,
      origin: [120, 196],
      sway: 1,
      draw: (p) => (
        <>
          <Leaf x={120} y={196} a={-50} l={22} w={9} c={BUSH} p={p} />
          <Leaf x={120} y={196} a={50} l={22} w={9} c={BUSH} p={p} />
        </>
      ),
    },
    {
      stage: 4,
      origin: [120, 120],
      draw: (p) => (
        <>
          <Blossom x={100} y={104} r={4} color="#FFFFFF" p={p} />
          <Blossom x={146} y={124} r={4} color="#FFFFFF" p={p} />
          <Blossom x={118} y={136} r={4} color="#FFFFFF" p={p} />
        </>
      ),
    },
    {
      stage: 5,
      origin: [120, 150],
      sway: 2,
      draw: (p) => (
        <>
          <Chili x={78} y={140} s={0.95} p={p} />
          <Chili x={98} y={158} s={1.05} p={p} />
          <Chili x={124} y={162} s={1.05} color="#FF7A1A" p={p} />
          <Chili x={146} y={156} s={1.05} p={p} />
          <Chili x={164} y={136} s={0.95} p={p} />
          <Chili x={112} y={110} s={0.9} p={p} />
          <Chili x={140} y={104} s={0.9} color="#FF7A1A" p={p} />
        </>
      ),
    },
  ],
  tops: [207, 184, 128, 102, 90, 90],
  glow: { x: 120, y: 130 },
};

/* Pomodoro: a vine tied to a cane, in a wooden crate, with clusters of tomatoes. */

const TOMATO_LEAF = { fill: '#5DB443', shade: '#3C8A2B' };

function Compound({ x, y, a, l, p }: { x: number; y: number; a: number; l: number; p: Paint }) {
  const r = l * 0.3;
  return (
    <G transform={`rotate(${a} ${x} ${y})`}>
      <Stalk d={`M${x} ${y} L${x} ${y - l}`} w={2.4} color="#3C8A2B" p={p} />
      <Leaf x={x} y={y - l * 0.4} a={-58} l={r * 1.4} w={r * 0.6} c={TOMATO_LEAF} p={p} />
      <Leaf x={x} y={y - l * 0.4} a={58} l={r * 1.4} w={r * 0.6} c={TOMATO_LEAF} p={p} />
      <Leaf x={x} y={y - l * 0.72} a={-50} l={r * 1.3} w={r * 0.55} c={TOMATO_LEAF} p={p} />
      <Leaf x={x} y={y - l * 0.72} a={50} l={r * 1.3} w={r * 0.55} c={TOMATO_LEAF} p={p} />
      <Leaf x={x} y={y - l} a={0} l={r * 1.5} w={r * 0.62} c={TOMATO_LEAF} p={p} />
    </G>
  );
}

const pomodoro: Look = {
  pot: POTS.crate,
  colors: { body: '#C98A4B', rim: '#DDA463' },
  parts: [
    {
      stage: 1,
      origin: [128, GROUND],
      draw: (p) => (
        <>
          <Stalk d="M130 218 L130 38" w={5} color="#E0BE76" p={p} />
          {[180, 130, 80].map((y) => (
            <Path key={y} d={`M127 ${y} L133 ${y}`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          ))}
        </>
      ),
    },
    {
      stage: 1,
      stretch: 4.4,
      upright: true,
      origin: [116, GROUND],
      draw: (p) => (
        <Stalk
          d="M116 216 C 128 196, 110 176, 120 156 C 130 136, 108 118, 118 98 C 128 80, 112 66, 120 50"
          w={5}
          color="#5DB443"
          p={p}
        />
      ),
    },
    {
      stage: 2,
      origin: [124, 170],
      draw: (p) => (
        <>
          {[
            [126, 168],
            [124, 116],
            [124, 76],
          ].map(([x, y]) => (
            <Ellipse key={y} cx={x} cy={y} rx={8} ry={3.5} fill={p('#F2E2B8')} stroke={INK} strokeWidth={1.6} />
          ))}
        </>
      ),
    },
    { stage: 1, origin: [118, 200], sway: 1, draw: (p) => <><Compound x={118} y={200} a={-50} l={22} p={p} /><Compound x={118} y={200} a={50} l={22} p={p} /></> },
    { stage: 2, origin: [118, 176], sway: 1.5, draw: (p) => <><Compound x={122} y={184} a={62} l={46} p={p} /><Compound x={114} y={166} a={-64} l={46} p={p} /></> },
    { stage: 3, origin: [118, 128], sway: 2, draw: (p) => <><Compound x={124} y={138} a={58} l={44} p={p} /><Compound x={112} y={118} a={-60} l={44} p={p} /></> },
    { stage: 4, origin: [118, 84], sway: 2.5, draw: (p) => <><Compound x={122} y={90} a={54} l={36} p={p} /><Compound x={116} y={72} a={-50} l={30} p={p} /></> },
    {
      stage: 4,
      origin: [120, 120],
      draw: (p) => (
        <>
          <Star x={152} y={150} r={7} p={p} />
          <Star x={90} y={128} r={7} p={p} />
          <Star x={150} y={98} r={7} p={p} />
        </>
      ),
    },
    {
      stage: 5,
      origin: [120, 130],
      sway: 2,
      draw: (p) => (
        <>
          <Tomato x={142} y={154} s={0.9} p={p} />
          <Tomato x={158} y={160} s={0.9} p={p} />
          <Tomato x={148} y={172} s={0.9} p={p} />
          <Tomato x={86} y={132} s={0.9} p={p} />
          <Tomato x={100} y={140} s={0.9} p={p} />
          <Tomato x={90} y={150} s={0.85} p={p} />
          <Tomato x={146} y={104} s={0.85} p={p} />
          <Tomato x={160} y={110} s={0.85} p={p} />
        </>
      ),
    },
  ],
  tops: [207, 36, 36, 36, 36, 36],
  glow: { x: 120, y: 110 },
};

/* Lavanda: a silvery tuft of thin leaves and a fan of purple spikes. */

const LAVENDER_LEAF = { fill: '#9DBB8A', shade: '#748F63' };
const blades = (leaves: [number, number][]) => (p: Paint) =>
  leaves.map(([a, l]) => <Leaf key={a} x={120} y={GROUND} a={a} l={l} w={l * 0.14} c={LAVENDER_LEAF} p={p} />);

const SPIKES: [number, number][] = [
  [-34, 96],
  [-22, 108],
  [-11, 116],
  [0, 122],
  [11, 116],
  [22, 108],
  [34, 96],
];

function spikeHeads(p: Paint, colors: [string, string, string]) {
  return SPIKES.map(([a, len]) => {
    const x = 120;
    const y = 196;
    return (
      <G key={a} transform={`rotate(${a} ${x} ${y})`}>
        {Array.from({ length: 6 }, (_, i) => {
          const fy = y - len + i * 6.5;
          const r = 3.6 + i * 0.35;
          return (
            <G key={i}>
              <Ellipse cx={x - r * 0.6} cy={fy} rx={r} ry={r * 0.85} fill={p(colors[i % 2])} stroke={INK} strokeWidth={1.5} />
              <Ellipse cx={x + r * 0.6} cy={fy + 2} rx={r} ry={r * 0.85} fill={p(colors[(i + 1) % 2 ? 2 : 1])} stroke={INK} strokeWidth={1.5} />
            </G>
          );
        })}
      </G>
    );
  });
}

const lavanda: Look = {
  pot: POTS.round,
  colors: { body: '#B9A1E0', rim: '#CDB9EC' },
  parts: [
    {
      stage: 4,
      origin: [120, 196],
      sway: 3,
      draw: (p) =>
        SPIKES.map(([a, len]) => (
          <G key={a} transform={`rotate(${a} 120 196)`}>
            <Stalk d={`M120 196 L120 ${196 - len + 6}`} w={2} color="#7FA36A" p={p} />
          </G>
        )),
    },
    { stage: 4, until: 5, origin: [120, 196], sway: 3, draw: (p) => spikeHeads(p, ['#8FBF6A', '#A5CF80', '#8FBF6A']) },
    { stage: 5, origin: [120, 196], sway: 3, draw: (p) => spikeHeads(p, ['#8A55C9', '#9B6BD6', '#A982E0']) },
    {
      stage: 3,
      origin: [120, GROUND],
      sway: 1.5,
      draw: blades([
        [-78, 40],
        [-54, 48],
        [-28, 54],
        [-4, 58],
        [22, 54],
        [48, 48],
        [74, 40],
      ]),
    },
    {
      stage: 2,
      origin: [120, GROUND],
      sway: 1,
      draw: blades([
        [-62, 34],
        [-38, 40],
        [-14, 44],
        [12, 44],
        [36, 40],
        [60, 34],
      ]),
    },
    {
      stage: 1,
      origin: [120, GROUND],
      draw: blades([
        [-12, 24],
        [14, 26],
      ]),
    },
  ],
  tops: [207, 190, 172, 160, 72, 72],
  glow: { x: 120, y: 110 },
};

/* Ulivo: a bonsai, a twisted trunk under flat silvery pads, in a glazed tray. */

const OLIVE_LEAF = { fill: '#8FAE6B', shade: '#6C8A4E', light: '#A9C485' };
const BARK = '#8A6A44';

function Pad({ cx, cy, rx, ry, p }: { cx: number; cy: number; rx: number; ry: number; p: Paint }) {
  return (
    <G>
      <Ellipse cx={cx - rx * 0.45} cy={cy + 2} rx={rx * 0.6} ry={ry * 0.85} fill={p(OLIVE_LEAF.fill)} stroke={INK} strokeWidth={2.4} />
      <Ellipse cx={cx + rx * 0.45} cy={cy + 2} rx={rx * 0.6} ry={ry * 0.85} fill={p(OLIVE_LEAF.fill)} stroke={INK} strokeWidth={2.4} />
      <Ellipse cx={cx} cy={cy - 2} rx={rx * 0.65} ry={ry} fill={p(OLIVE_LEAF.fill)} stroke={INK} strokeWidth={2.4} />
      <Ellipse cx={cx - rx * 0.05} cy={cy - 3} rx={rx * 0.75} ry={ry * 0.5} fill={p(OLIVE_LEAF.light)} />
      <Path
        d={`M${cx - rx * 0.6} ${cy + 3} l 7 -3 M${cx - rx * 0.1} ${cy - 5} l 7 -3 M${cx + rx * 0.35} ${cy + 3} l 7 -3`}
        stroke={p(OLIVE_LEAF.shade)}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

const ulivo: Look = {
  pot: POTS.tray,
  colors: { body: '#6F86A3', rim: '#8CA2BE' },
  parts: [
    {
      stage: 1,
      until: 2.6,
      origin: [120, GROUND],
      sway: 1,
      draw: (p) => (
        <>
          <Stalk d="M120 216 L120 182" w={3} color={BARK} p={p} />
          {[
            [196, -60],
            [196, 60],
            [184, -30],
            [184, 30],
          ].map(([y, a]) => (
            <Leaf key={`${y}${a}`} x={120} y={y} a={a} l={18} w={4.5} c={OLIVE_LEAF} p={p} />
          ))}
        </>
      ),
    },
    {
      stage: 2,
      stretch: 3,
      upright: true,
      origin: [117, GROUND],
      draw: (p) => (
        <G>
          <Path
            d="M104 218 C 102 196, 128 186, 122 164 C 116 146, 98 140, 102 118 L 116 118 C 114 136, 132 144, 136 164 C 142 190, 120 198, 130 218 Z"
            fill={p(BARK)}
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Path d="M112 206 C 114 196, 124 190, 124 178 M110 150 C 108 142, 106 136, 108 126" stroke={p('#6B5032')} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Ellipse cx={124} cy={168} rx={3} ry={4} fill={p('#6B5032')} />
        </G>
      ),
    },
    {
      stage: 3,
      origin: [116, 140],
      draw: (p) => (
        <>
          <Stalk d="M106 132 C 96 124, 86 118, 74 110" w={6} color={BARK} p={p} />
          <Stalk d="M128 156 C 140 146, 150 136, 162 124" w={6} color={BARK} p={p} />
        </>
      ),
    },
    {
      stage: 4,
      origin: [116, 110],
      sway: 1.5,
      draw: (p) => (
        <>
          <Pad cx={124} cy={78} rx={28} ry={14} p={p} />
          <Pad cx={70} cy={104} rx={28} ry={14} p={p} />
        </>
      ),
    },
    {
      stage: 3,
      origin: [116, 120],
      sway: 1,
      draw: (p) => (
        <>
          <Pad cx={164} cy={118} rx={30} ry={15} p={p} />
          <Pad cx={110} cy={102} rx={38} ry={18} p={p} />
        </>
      ),
    },
    {
      stage: 5,
      origin: [116, 110],
      sway: 1.5,
      draw: (p) => (
        <>
          <Olive x={96} y={110} s={0.85} color="#4B2C4F" p={p} />
          <Olive x={124} y={112} s={0.85} color="#6E8B3D" p={p} />
          <Olive x={62} y={112} s={0.85} color="#4B2C4F" p={p} />
          <Olive x={80} y={114} s={0.8} color="#6E8B3D" p={p} />
          <Olive x={158} y={128} s={0.85} color="#4B2C4F" p={p} />
          <Olive x={176} y={126} s={0.8} color="#4B2C4F" p={p} />
          <Olive x={136} y={86} s={0.8} color="#4B2C4F" p={p} />
        </>
      ),
    },
  ],
  tops: [207, 176, 150, 82, 62, 62],
  glow: { x: 116, y: 100 },
};

/** The empty pot, when nothing is growing. */
const empty: Look = {
  pot: POTS.classic,
  colors: { body: '#E57A4E', rim: '#F29063' },
  parts: [],
  tops: [207, 207, 207, 207, 207, 207],
  glow: { x: 120, y: 150 },
};

export const LOOKS: Record<SpeciesId, Look> = {
  crescione,
  ravanello,
  basilico,
  calendula,
  fragola,
  girasole,
  peperoncino,
  pomodoro,
  lavanda,
  ulivo,
};

export function lookOf(species: SpeciesId | null | undefined): Look {
  return species ? LOOKS[species] : empty;
}
