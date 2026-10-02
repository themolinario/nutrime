import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  BOX,
  LEAVES,
  STEM_BY_STAGE,
  STEM_LENGTH,
  STEM_PATH,
  stemPoint,
  TOP,
  type LeafSlot,
} from './geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Cartoon palette: flat fills, a dark ink outline, a lighter highlight. */
export const INK = '#2B2A1F';
const GREEN = '#7BCB52';
const GREEN_DARK = '#58A83A';
const DRY = '#CFA86A';
const DRY_DARK = '#A8834C';
const POT = '#E57A4E';
const POT_RIM = '#F29063';
const SOIL = '#6B4226';
const PETAL = '#FF8FB3';
const PETAL_LIGHT = '#FFC2D5';
const PETAL_DRY = '#C9A07A';
const GOLD = '#FFD23F';

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
  /** Growth, 0 (bare soil) to 5 (in flower). */
  grow: SharedValue<number>;
  /** 0 healthy, 1 dried out. */
  dry: SharedValue<number>;
  /** 0 off, 1 lit up. */
  glow: SharedValue<number>;
  /** Idle breeze, -1 to 1. */
  sway: SharedValue<number>;
};

function Stem({ grow, dry }: Drivers) {
  const shown = (g: number) => {
    'worklet';
    return interpolate(g, [0, 1, 2, 3, 4, 5], STEM_BY_STAGE, 'clamp');
  };
  const outline = useAnimatedProps(() => ({
    strokeDashoffset: STEM_LENGTH * (1 - shown(grow.value)),
  }));
  const green = useAnimatedProps(() => ({
    strokeDashoffset: STEM_LENGTH * (1 - shown(grow.value)),
  }));
  const brown = useAnimatedProps(() => ({
    strokeDashoffset: STEM_LENGTH * (1 - shown(grow.value)),
    strokeOpacity: dry.value,
  }));
  // A round cap would leave a dot in the soil before anything grew.
  const visible = useAnimatedStyle(() => ({ opacity: grow.value > 0.05 ? 1 : 0 }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, visible]} pointerEvents="none">
      <Svg width={BOX.width} height={BOX.height}>
        <AnimatedPath
          d={STEM_PATH}
          stroke={INK}
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={STEM_LENGTH}
          animatedProps={outline}
        />
        <AnimatedPath
          d={STEM_PATH}
          stroke={GREEN_DARK}
          strokeWidth={5.5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={STEM_LENGTH}
          animatedProps={green}
        />
        <AnimatedPath
          d={STEM_PATH}
          stroke={DRY_DARK}
          strokeWidth={5.5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={STEM_LENGTH}
          animatedProps={brown}
        />
      </Svg>
    </Animated.View>
  );
}

const LEAF_BODY = 'M2 13 C 12 -1, 36 -3, 48 11 C 37 25, 13 27, 2 13 Z';
const LEAF_SHADE = 'M2 13 C 18 12, 34 12, 48 11 C 37 25, 13 27, 2 13 Z';
const LEAF_VEIN = 'M5 13 Q 24 10 42 11';

function LeafArt({ fill, shade, side }: { fill: string; shade: string; side: 1 | -1 }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 50 26" preserveAspectRatio="none">
      <G transform={side === -1 ? 'translate(50 0) scale(-1 1)' : undefined}>
        <Path d={LEAF_BODY} fill={fill} />
        <Path d={LEAF_SHADE} fill={shade} />
        <Path d={LEAF_VEIN} stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d={LEAF_BODY} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" fill="none" />
        <Ellipse cx={17} cy={8} rx={5} ry={2} fill="#FFFFFF" opacity={0.45} />
      </G>
    </Svg>
  );
}

function Leaf({ slot, grow, dry, sway }: Drivers & { slot: LeafSlot }) {
  const point = stemPoint(slot.at);
  const width = slot.size;
  const height = slot.size * 0.52;
  // Leaves higher up catch more of the breeze.
  const reach = 2 + slot.at * 5;

  const style = useAnimatedStyle(() => {
    const scale = pop(ramp(grow.value, slot.stage - 0.6, 0.6));
    const breeze = sway.value * reach;
    const angle = slot.side * (-24 + 50 * dry.value) + breeze;
    return { transform: [{ rotate: `${angle}deg` }, { scale }] };
  });
  const dried = useAnimatedStyle(() => ({ opacity: dry.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: slot.side === 1 ? point.x - 2 : point.x - width + 2,
          top: point.y - height / 2,
          width,
          height,
          transformOrigin: slot.side === 1 ? 'left center' : 'right center',
        },
        style,
      ]}
    >
      <LeafArt fill={GREEN} shade={GREEN_DARK} side={slot.side} />
      <Animated.View style={[StyleSheet.absoluteFill, dried]}>
        <LeafArt fill={DRY} shade={DRY_DARK} side={slot.side} />
      </Animated.View>
    </Animated.View>
  );
}

function Bud({ grow }: Drivers) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - ramp(grow.value, 4.3, 0.3),
    transform: [{ scale: pop(ramp(grow.value, 3.4, 0.6)) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: TOP.x - 11, top: TOP.y - 22, width: 22, height: 28 },
        { transformOrigin: 'center bottom' },
        style,
      ]}
    >
      <Svg width={22} height={28} viewBox="0 0 22 28">
        <Path
          d="M11 2 C 20 10, 20 20, 11 26 C 2 20, 2 10, 11 2 Z"
          fill={GREEN}
          stroke={INK}
          strokeWidth={2.2}
        />
        <Path d="M11 6 C 15 12, 15 18, 11 23" stroke={PETAL} strokeWidth={3} fill="none" />
      </Svg>
    </Animated.View>
  );
}

const FLOWER = 76;

function FlowerArt({ petal, light, face }: { petal: string; light: string; face: boolean }) {
  const c = FLOWER / 2;
  return (
    <Svg width={FLOWER} height={FLOWER} viewBox={`0 0 ${FLOWER} ${FLOWER}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <G key={i} transform={`rotate(${i * 60} ${c} ${c})`}>
          <Ellipse cx={c} cy={c - 20} rx={12} ry={17} fill={petal} stroke={INK} strokeWidth={2.4} />
          <Ellipse cx={c - 3} cy={c - 26} rx={4} ry={6} fill={light} />
        </G>
      ))}
      <Circle cx={c} cy={c} r={15} fill={GOLD} stroke={INK} strokeWidth={2.4} />
      {face ? (
        <>
          <Ellipse cx={c - 5} cy={c - 2} rx={2} ry={2.8} fill={INK} />
          <Ellipse cx={c + 5} cy={c - 2} rx={2} ry={2.8} fill={INK} />
          <Path
            d={`M${c - 5} ${c + 4} Q ${c} ${c + 9} ${c + 5} ${c + 4}`}
            stroke={INK}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={c - 10} cy={c + 4} r={2.6} fill="#FF7A8A" opacity={0.55} />
          <Circle cx={c + 10} cy={c + 4} r={2.6} fill="#FF7A8A" opacity={0.55} />
        </>
      ) : (
        <Path
          d={`M${c - 5} ${c + 6} Q ${c} ${c + 2} ${c + 5} ${c + 6}`}
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

function Flower({ grow, dry, sway }: Drivers) {
  const style = useAnimatedStyle(() => {
    const open = ramp(grow.value, 4.2, 0.8);
    return {
      transform: [
        { rotate: `${(1 - open) * -120 + 34 * dry.value + sway.value * 3}deg` },
        { scale: pop(open) },
      ],
    };
  });
  const dried = useAnimatedStyle(() => ({ opacity: dry.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: TOP.x - FLOWER / 2,
          top: TOP.y - FLOWER / 2 - 6,
          width: FLOWER,
          height: FLOWER,
        },
        style,
      ]}
    >
      <FlowerArt petal={PETAL} light={PETAL_LIGHT} face />
      <Animated.View style={[StyleSheet.absoluteFill, dried]}>
        <FlowerArt petal={PETAL_DRY} light="#DDBF9C" face={false} />
      </Animated.View>
    </Animated.View>
  );
}

const HALO = 200;

/** Warm light behind the flower, with slowly turning rays. */
function Halo({ glow, live }: Drivers & { live: boolean }) {
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
        { position: 'absolute', left: TOP.x - c, top: TOP.y - c - 6, width: HALO, height: HALO },
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

const POT_BODY = 'M70 234 L170 234 L158 288 Q156 294 150 294 L90 294 Q84 294 82 288 Z';

/** The pot, with a face that smiles, blinks and frowns once the plant dries. */
function Pot({ dry, live }: Pick<Drivers, 'dry'> & { live: boolean }) {
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={BOX.width} height={BOX.height}>
        <Ellipse cx={120} cy={296} rx={62} ry={6} fill="#000000" opacity={0.18} />
        <Path d={POT_BODY} fill={POT} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d="M84 242 L92 284" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.3} />
        <Rect x={60} y={212} width={120} height={26} rx={9} fill={POT_RIM} stroke={INK} strokeWidth={3.5} />
        <Ellipse cx={120} cy={216} rx={50} ry={6} fill={SOIL} stroke={INK} strokeWidth={2.5} />
        <Rect x={68} y={226} width={40} height={5} rx={2.5} fill="#FFFFFF" opacity={0.35} />
        <Circle cx={96} cy={268} r={6} fill="#FF7A8A" opacity={0.5} />
        <Circle cx={144} cy={268} r={6} fill="#FF7A8A" opacity={0.5} />
      </Svg>
      <Animated.View style={[styles.eyes, eyes]}>
        <Svg width={48} height={16} viewBox="0 0 48 16">
          <Ellipse cx={8} cy={8} rx={5} ry={7} fill={INK} />
          <Ellipse cx={40} cy={8} rx={5} ry={7} fill={INK} />
          <Circle cx={9.6} cy={5.5} r={1.8} fill="#FFFFFF" />
          <Circle cx={41.6} cy={5.5} r={1.8} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.mouth, smile]}>
        <Svg width={24} height={14} viewBox="0 0 24 14">
          <Path d="M3 3 Q 12 14 21 3" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="#8A2E2E" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.mouth, frown]}>
        <Svg width={24} height={14} viewBox="0 0 24 14">
          <Path d="M4 11 Q 12 3 20 11" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * The habit plant, drawn at `size` points wide. What it looks like comes from
 * the shared values, so the celebration can animate it and the badge can hold
 * it still.
 */
export function Plant({
  size,
  grow,
  dry,
  glow,
  live = true,
  behind,
  front,
}: Omit<Drivers, 'sway'> & {
  size: number;
  live?: boolean;
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
        <Halo {...drivers} live={live} />
        {behind}
        <Stem {...drivers} />
        {LEAVES.map((slot, i) => (
          <Leaf key={i} slot={slot} {...drivers} />
        ))}
        <Bud {...drivers} />
        <Flower {...drivers} />
        <Pot dry={dry} live={live} />
        {front}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyes: { position: 'absolute', left: 96, top: 248, width: 48, height: 16 },
  mouth: { position: 'absolute', left: 108, top: 262, width: 24, height: 14 },
});
