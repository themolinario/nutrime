import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { INK, pop, ramp } from './Plant';

/**
 * The extras around the plant, all in its 240 × 300 coordinates and all driven
 * by `time`: the milliseconds since the celebration started.
 */
type Timed = { time: SharedValue<number> };

const AnimatedPath = Animated.createAnimatedComponent(Path);

function Sprite({
  x,
  y,
  size,
  style,
  children,
}: {
  x: number;
  y: number;
  size: number;
  style: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const STAR = 'M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1Z';

function StarArt({ color = '#FFF1A1' }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24">
      <Path d={STAR} fill={color} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

/* ── Water drops: a dried plant gets a drink before coming back ────────── */

function Drop({ time, index }: Timed & { index: number }) {
  const x = 96 + index * 24;
  const start = 150 + index * 140;
  const style = useAnimatedStyle(() => {
    const fall = ramp(time.value, start, 420);
    const splash = ramp(time.value, start + 420, 220);
    return {
      opacity: fall > 0 ? 1 - splash : 0,
      transform: [
        { translateY: -230 * (1 - fall * fall) },
        { scaleX: 1 + splash * 1.4 },
        { scaleY: 1 - splash * 0.6 },
      ],
    };
  });
  return (
    <Sprite x={x} y={200} size={22} style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 22 22">
        <Path
          d="M11 1 C 15 7, 19 11, 19 14 A 8 8 0 0 1 3 14 C 3 11, 7 7, 11 1 Z"
          fill="#6EC6FF"
          stroke={INK}
          strokeWidth={1.8}
        />
        <Ellipse cx={8} cy={13} rx={2} ry={3} fill="#FFFFFF" opacity={0.7} />
      </Svg>
    </Sprite>
  );
}

export function Drops({ time }: Timed) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Drop key={i} time={time} index={i} />
      ))}
    </>
  );
}

/* ── The seed: the first day starts from bare soil ─────────────────────── */

export function Seed({ time }: Timed) {
  const style = useAnimatedStyle(() => {
    const fall = ramp(time.value, 150, 480);
    const bounce = Math.sin(ramp(time.value, 630, 260) * Math.PI) * 12;
    return {
      opacity: 1 - ramp(time.value, 900, 200),
      transform: [
        { translateY: -240 * (1 - fall * fall) - bounce },
        { rotate: `${fall * 300}deg` },
      ],
    };
  });
  return (
    <Sprite x={120} y={208} size={18} style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 18 18">
        <Ellipse cx={9} cy={9} rx={5.5} ry={8} fill="#B8783F" stroke={INK} strokeWidth={1.8} />
        <Ellipse cx={7.5} cy={6} rx={1.5} ry={2.5} fill="#FFFFFF" opacity={0.5} />
      </Svg>
    </Sprite>
  );
}

/* ── Confetti: petals bursting out of the plant ────────────────────────── */

const CONFETTI_COLORS = ['#FF8FB3', '#FFD23F', '#7BCB52', '#FFFFFF', '#6EC6FF', '#FF9F43'];

type From = { at: { x: number; y: number } };

function Confetto({ time, index, start, at }: Timed & From & { index: number; start: number }) {
  const angle = (index / 18) * Math.PI * 2 + (index % 3) * 0.2;
  const speed = 90 + (index % 4) * 30;
  const style = useAnimatedStyle(() => {
    const p = ramp(time.value, start, 1300);
    const out = 1 - (1 - p) * (1 - p);
    return {
      opacity: p > 0 ? 1 - ramp(p, 0.65, 0.35) : 0,
      transform: [
        { translateX: Math.cos(angle) * speed * out },
        { translateY: Math.sin(angle) * speed * out + 140 * p * p },
        { rotate: `${p * 540 * (index % 2 ? 1 : -1)}deg` },
        { scale: pop(ramp(p, 0, 0.15)) },
      ],
    };
  });
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  return (
    <Sprite x={at.x} y={at.y} size={12} style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 12 12">
        {index % 2 ? (
          <Ellipse cx={6} cy={6} rx={3.5} ry={5.5} fill={color} stroke={INK} strokeWidth={1.2} />
        ) : (
          <Path d="M1 4 L11 2 L10 8 L2 10 Z" fill={color} stroke={INK} strokeWidth={1.2} />
        )}
      </Svg>
    </Sprite>
  );
}

export function Confetti({ time, start, at }: Timed & From & { start: number }) {
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => (
        <Confetto key={i} time={time} index={i} start={start} at={at} />
      ))}
    </>
  );
}

/* ── Sparkles twinkling around a lit plant ─────────────────────────────── */

const SPARKLES = [
  { x: 40, y: 70, size: 22 },
  { x: 200, y: 50, size: 18 },
  { x: 214, y: 150, size: 24 },
  { x: 28, y: 170, size: 16 },
  { x: 176, y: 110, size: 14 },
  { x: 62, y: 120, size: 14 },
  { x: 120, y: 0, size: 20 },
];

function Sparkle({
  time,
  glow,
  index,
}: Timed & { glow: SharedValue<number>; index: number }) {
  const { x, y, size } = SPARKLES[index];
  const style = useAnimatedStyle(() => {
    const phase = ((time.value + index * 170) % 1000) / 1000;
    const twinkle = Math.sin(phase * Math.PI);
    return {
      opacity: glow.value * twinkle,
      transform: [{ scale: 0.3 + 0.9 * twinkle }, { rotate: `${phase * 90}deg` }],
    };
  });
  return (
    <Sprite x={x} y={y} size={size} style={style}>
      <StarArt />
    </Sprite>
  );
}

export function Sparkles({ time, glow }: Timed & { glow: SharedValue<number> }) {
  return (
    <>
      {SPARKLES.map((_, i) => (
        <Sparkle key={i} time={time} glow={glow} index={i} />
      ))}
    </>
  );
}

/* ── Butterflies ───────────────────────────────────────────────────────── */

const BUTTERFLIES = [
  { wing: '#FFB547', spot: '#FF7A45', from: { x: -120, y: 40 }, cx: 70, cy: 110, phase: 0 },
  { wing: '#7FD3FF', spot: '#3E8EDE', from: { x: 360, y: 20 }, cx: 175, cy: 80, phase: 2.1 },
  { wing: '#C792FF', spot: '#8A55D6', from: { x: 330, y: 280 }, cx: 160, cy: 170, phase: 4.2 },
];

function Butterfly({ time, index }: Timed & { index: number }) {
  const b = BUTTERFLIES[index];
  const style = useAnimatedStyle(() => {
    const arrive = ramp(time.value, 900 + index * 150, 800);
    const ease = 1 - (1 - arrive) * (1 - arrive);
    const t = time.value / 1000 + b.phase;
    const orbitX = b.cx + Math.sin(t * 2.2) * 26;
    const orbitY = b.cy + Math.sin(t * 4.4) * 12;
    const x = b.from.x + (orbitX - b.from.x) * ease;
    const y = b.from.y + (orbitY - b.from.y) * ease;
    return {
      opacity: arrive > 0 ? 1 : 0,
      transform: [
        { translateX: x - b.cx },
        { translateY: y - b.cy },
        { rotate: `${Math.cos(t * 2.2) * 18}deg` },
        { scaleX: 0.35 + 0.65 * Math.abs(Math.sin(time.value / 75)) },
      ],
    };
  });
  return (
    <Sprite x={b.cx} y={b.cy} size={34} style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 34 34">
        <Path d="M17 16 C 8 2, 0 6, 3 15 C 5 20, 12 19, 17 17 Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
        <Path d="M17 16 C 26 2, 34 6, 31 15 C 29 20, 22 19, 17 17 Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
        <Path d="M17 18 C 10 20, 6 28, 11 29 C 15 29, 16 23, 17 19 Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
        <Path d="M17 18 C 24 20, 28 28, 23 29 C 19 29, 18 23, 17 19 Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
        <Circle cx={9} cy={11} r={2.5} fill={b.spot} />
        <Circle cx={25} cy={11} r={2.5} fill={b.spot} />
        <Ellipse cx={17} cy={18} rx={2} ry={8} fill={INK} />
        <Path d="M16 10 Q 13 4 11 4 M18 10 Q 21 4 23 4" stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Sprite>
  );
}

export function Butterflies({ time }: Timed) {
  return (
    <>
      {BUTTERFLIES.map((_, i) => (
        <Butterfly key={i} time={time} index={i} />
      ))}
    </>
  );
}

/* ── A rainbow behind the plant ────────────────────────────────────────── */

const BANDS = ['#FF5A5F', '#FF9F43', '#FFD23F', '#7BCB52', '#4DA8FF', '#9B6BFF'];
const ARC_Y = 214;

function Band({ time, index }: Timed & { index: number }) {
  const r = 168 - index * 13;
  const length = Math.PI * r;
  const props = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - ramp(time.value, 800 + index * 60, 800)),
  }));
  return (
    <AnimatedPath
      d={`M${120 - r} ${ARC_Y} A ${r} ${r} 0 0 1 ${120 + r} ${ARC_Y}`}
      stroke={BANDS[index]}
      strokeWidth={13}
      fill="none"
      strokeDasharray={length}
      animatedProps={props}
    />
  );
}

function Cloud({ time, x }: Timed & { x: number }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: pop(ramp(time.value, x < 120 ? 700 : 1500, 400)) },
      { translateY: Math.sin(time.value / 400) * 3 },
    ],
  }));
  return (
    <Sprite x={x} y={ARC_Y - 6} size={70} style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 70 70">
        <Path
          d="M14 48 C 4 48, 4 34, 15 34 C 15 22, 32 20, 36 30 C 40 22, 56 24, 55 36 C 66 36, 66 48, 56 48 Z"
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </Svg>
    </Sprite>
  );
}

export function Rainbow({ time }: Timed) {
  return (
    <>
      <Svg
        width={420}
        height={260}
        viewBox="-90 0 420 260"
        style={[StyleSheet.absoluteFill, { left: -90, width: 420, height: 260 }]}
      >
        {BANDS.map((_, i) => (
          <Band key={i} time={time} index={i} />
        ))}
      </Svg>
      <Cloud time={time} x={120 - 150} />
      <Cloud time={time} x={120 + 150} />
    </>
  );
}

/* ── A shower of stars ─────────────────────────────────────────────────── */

function FallingStar({ time, index }: Timed & { index: number }) {
  const x = -70 + ((index * 67) % 380);
  const size = 14 + (index % 3) * 7;
  const start = 700 + ((index * 113) % 900);
  const style = useAnimatedStyle(() => {
    const p = ramp(time.value, start, 1500);
    return {
      opacity: p > 0 && p < 1 ? 1 : 0,
      transform: [
        { translateY: -320 + 720 * p },
        { translateX: -40 * p },
        { rotate: `${p * 400}deg` },
      ],
    };
  });
  return (
    <Sprite x={x} y={0} size={size} style={style}>
      <StarArt color={index % 4 === 0 ? '#FFFFFF' : '#FFE27A'} />
    </Sprite>
  );
}

export function StarShower({ time }: Timed) {
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => (
        <FallingStar key={i} time={time} index={i} />
      ))}
    </>
  );
}
