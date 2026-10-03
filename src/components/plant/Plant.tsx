import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { SpeciesId } from '../../lib/garden';
import { BOX } from './geometry';
import { INK, lookOf, paintFor, partScale, type Look, type Paint, type Part } from './species';

export { INK };
const SOIL = '#6B4226';

/** 0 → 1 over `span`, starting at `start`. */
export function ramp(value: number, start: number, span: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (value - start) / span));
}

/** Ease-out with a little overshoot: things pop into place. */
export function pop(p: number): number {
  'worklet';
  const c1 = 2.1;
  const q = p - 1;
  return 1 + (c1 + 1) * q * q * q + c1 * q * q;
}

type Drivers = {
  /** Growth, 0 (bare soil) to 5 (grown). */
  grow: SharedValue<number>;
  /** 0 healthy, 1 dried out. */
  dry: SharedValue<number>;
  /** 0 off, 1 lit up. */
  glow: SharedValue<number>;
  /** Idle breeze, -1 to 1. */
  sway: SharedValue<number>;
};

/** One part of the plant, popping in at its stage and dried out with the rest. */
function PartView({ part, grow, dry, sway }: Drivers & { part: Part }) {
  // Only plain numbers go into the worklet: the part also holds its drawing.
  const { stage, stretch = 0, until = 0, upright = false, sway: lean = 0 } = part;
  const [ox, oy] = part.origin;
  const style = useAnimatedStyle(() => {
    const s = partScale(grow.value, stage, stretch);
    const fade = until ? 1 - ramp(grow.value, until - 0.6, 0.5) : 1;
    return {
      opacity: s > 0.001 ? fade : 0,
      transform: [
        { rotate: `${lean * sway.value}deg` },
        upright ? { scaleY: Math.max(s, 0.001) } : { scale: Math.max(s, 0.001) },
      ],
    };
  });
  const dried = useAnimatedStyle(() => ({ opacity: dry.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: [ox, oy, 0] }, style]}
    >
      <Svg width={BOX.width} height={BOX.height}>
        {part.draw(paintFor(false), true)}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, dried]}>
        <Svg width={BOX.width} height={BOX.height}>
          {part.draw(paintFor(true), false)}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const HALO = 200;

/** Warm light behind the grown plant, with slowly turning rays. */
function Halo({ glow, live, at }: Drivers & { live: boolean; at: Look['glow'] }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!live) return;
    spin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1);
    return () => cancelAnimation(spin);
  }, [spin, live]);

  const halo = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + 0.4 * glow.value }],
  }));
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  const c = HALO / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: at.x - c, top: at.y - c, width: HALO, height: HALO },
        halo,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, rays]}>
        <Svg width={HALO} height={HALO}>
          {Array.from({ length: 12 }, (_, i) => (
            <Rect
              key={i}
              x={c - 3}
              y={6}
              width={6}
              height={40}
              rx={3}
              fill="#FFE27A"
              opacity={i % 2 ? 0.45 : 0.8}
              transform={`rotate(${i * 30} ${c} ${c})`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Svg width={HALO} height={HALO} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF4B8" stopOpacity={1} />
            <Stop offset="0.45" stopColor="#FFD23F" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFD23F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c * 0.72} fill="url(#halo)" />
      </Svg>
    </Animated.View>
  );
}

/** The pot itself, without its face: shadow, body, rim and soil. */
function PotArt({ look }: { look: Look }) {
  const { pot, colors } = look;
  const { rim } = pot;
  return (
    <>
      <Ellipse cx={120} cy={pot.shadow.cy} rx={pot.shadow.rx} ry={6} fill="#000000" opacity={0.18} />
      {pot.under}
      <Path d={pot.body} fill={colors.body} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      {pot.shine ? (
        <Path d={pot.shine} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.3} />
      ) : null}
      {pot.over}
      <Rect x={rim.x} y={rim.y} width={rim.w} height={rim.h} rx={9} fill={colors.rim} stroke={INK} strokeWidth={3.5} />
      <Ellipse cx={120} cy={rim.y + 4} rx={rim.w / 2 - 10} ry={6} fill={SOIL} stroke={INK} strokeWidth={2.5} />
      <Rect x={rim.x + 8} y={rim.y + 14} width={40} height={5} rx={2.5} fill="#FFFFFF" opacity={0.35} />
      <Circle cx={96} cy={pot.face + 20} r={6} fill="#FF7A8A" opacity={0.5} />
      <Circle cx={144} cy={pot.face + 20} r={6} fill="#FF7A8A" opacity={0.5} />
    </>
  );
}

const EYES = (
  <Svg width={48} height={16} viewBox="0 0 48 16">
    <Ellipse cx={8} cy={8} rx={5} ry={7} fill={INK} />
    <Ellipse cx={40} cy={8} rx={5} ry={7} fill={INK} />
    <Circle cx={9.6} cy={5.5} r={1.8} fill="#FFFFFF" />
    <Circle cx={41.6} cy={5.5} r={1.8} fill="#FFFFFF" />
  </Svg>
);
const SMILE = 'M3 3 Q 12 14 21 3';
const FROWN = 'M4 11 Q 12 3 20 11';

/** The pot, with a face that smiles, blinks and frowns once the plant dries. */
function Pot({ dry, live, look }: Pick<Drivers, 'dry'> & { live: boolean; look: Look }) {
  const blink = useSharedValue(1);
  useEffect(() => {
    if (!live) return;
    blink.value = withRepeat(
      withSequence(
        withDelay(1600, withTiming(0.1, { duration: 90 })),
        withTiming(1, { duration: 120 }),
      ),
      -1,
    );
    return () => cancelAnimation(blink);
  }, [blink, live]);

  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const smile = useAnimatedStyle(() => ({ opacity: 1 - dry.value }));
  const frown = useAnimatedStyle(() => ({ opacity: dry.value }));
  const face = look.pot.face;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={BOX.width} height={BOX.height}>
        <PotArt look={look} />
      </Svg>
      <Animated.View style={[styles.eyes, { top: face }, eyes]}>{EYES}</Animated.View>
      <Animated.View style={[styles.mouth, { top: face + 14 }, smile]}>
        <Svg width={24} height={14} viewBox="0 0 24 14">
          <Path d={SMILE} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="#8A2E2E" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.mouth, { top: face + 14 }, frown]}>
        <Svg width={24} height={14} viewBox="0 0 24 14">
          <Path d={FROWN} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * The plant being grown, drawn at `size` points wide. What it looks like comes
 * from the shared values, so the celebration can animate it and the badge can
 * hold it still.
 */
export function Plant({
  size,
  grow,
  dry,
  glow,
  live = true,
  species,
  behind,
  front,
}: Omit<Drivers, 'sway'> & {
  size: number;
  live?: boolean;
  /** The plant to draw; none is an empty pot. */
  species?: SpeciesId | null;
  /** Drawn in the plant's own coordinates, behind it and in front of it. */
  behind?: ReactNode;
  front?: ReactNode;
}) {
  const sway = useSharedValue(0);
  useEffect(() => {
    if (!live) return;
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [sway, live]);

  const look = lookOf(species);
  const drivers = { grow, dry, glow, sway };
  const scale = size / BOX.width;

  return (
    <View style={{ width: size, height: BOX.height * scale }} pointerEvents="none">
      <View
        style={{
          width: BOX.width,
          height: BOX.height,
          transformOrigin: 'left top',
          transform: [{ scale }],
        }}
      >
        <Halo {...drivers} live={live} at={look.glow} />
        {behind}
        {look.parts.map((part, i) =>
          part.front ? null : <PartView key={`${species}-${i}`} part={part} {...drivers} />,
        )}
        <Pot dry={dry} live={live} look={look} />
        {look.parts.map((part, i) =>
          part.front ? <PartView key={`${species}-${i}`} part={part} {...drivers} /> : null,
        )}
        {front}
      </View>
    </View>
  );
}

function stillPart(part: Part, grow: number, p: Paint, key: number) {
  const s = partScale(grow, part.stage, part.stretch ?? 0);
  if (s <= 0.001 || (part.until && grow >= part.until)) return null;
  const [ox, oy] = part.origin;
  const transform = part.upright
    ? `translate(0 ${oy}) scale(1 ${s}) translate(0 ${-oy})`
    : `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`;
  return (
    <G key={key} transform={transform}>
      {part.draw(p, true)}
    </G>
  );
}

/**
 * The same plant as a single still picture: much lighter than {@link Plant},
 * for lists that show many of them at once.
 */
export function PlantPicture({
  size,
  grow,
  species,
}: {
  size: number;
  grow: number;
  species: SpeciesId | null;
}) {
  const look = lookOf(species);
  const p = paintFor(false);
  const face = look.pot.face;
  return (
    <Svg width={size} height={(size * BOX.height) / BOX.width} viewBox={`0 0 ${BOX.width} ${BOX.height}`}>
      {look.parts.map((part, i) => (part.front ? null : stillPart(part, grow, p, i)))}
      <PotArt look={look} />
      <G transform={`translate(96 ${face})`}>
        <Ellipse cx={8} cy={8} rx={5} ry={7} fill={INK} />
        <Ellipse cx={40} cy={8} rx={5} ry={7} fill={INK} />
        <Circle cx={9.6} cy={5.5} r={1.8} fill="#FFFFFF" />
        <Circle cx={41.6} cy={5.5} r={1.8} fill="#FFFFFF" />
      </G>
      <G transform={`translate(108 ${face + 14})`}>
        <Path d={SMILE} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="#8A2E2E" />
      </G>
      {look.parts.map((part, i) => (part.front ? stillPart(part, grow, p, i) : null))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  eyes: { position: 'absolute', left: 96, width: 48, height: 16 },
  mouth: { position: 'absolute', left: 108, width: 24, height: 14 },
});
