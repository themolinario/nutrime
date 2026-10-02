import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { FULL_GROWN, useCelebration, type Celebration } from '../../lib/plant';
import { Icon, type IconName } from '../Icon';
import { fonts, spacing } from '../../theme';
import {
  Butterflies,
  Confetti,
  Drops,
  Fruits,
  Rainbow,
  Seed,
  Sparkles,
  StarShower,
} from './Effects';
import { Plant, pop, ramp } from './Plant';

/** The whole show, exit included: a couple of seconds, skippable with a tap. */
const TOTAL = 3600;
const EXIT = 350;
/** Taps this early are the finger that triggered the show, still lifting: they don't close it. */
const TAP_GRACE = 700;

/** Shown above everything, the rest of the app dimmed, whenever a day gets completed. */
export function PlantCelebrationHost() {
  const current = useCelebration((s) => s.current);
  const seq = useCelebration((s) => s.seq);
  if (!current) return null;
  return <Show key={seq} celebration={current} />;
}

/** The celebration's icon in a glowing bubble, popping in just before the title. */
function Badge({ icon, time, start }: { icon: IconName; time: SharedValue<number>; start: number }) {
  const style = useAnimatedStyle(() => {
    const p = ramp(time.value, start, 420);
    return {
      opacity: p > 0 ? 1 : 0,
      transform: [{ scale: pop(p) }, { rotate: `${(1 - p) * -40}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.badge, style]}>
      <Icon name={icon} size={26} color="#FFE27A" />
    </Animated.View>
  );
}

function Word({
  word,
  index,
  time,
  start,
}: {
  word: string;
  index: number;
  time: SharedValue<number>;
  start: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = ramp(time.value, start + index * 90, 380);
    return {
      opacity: p > 0 ? 1 : 0,
      transform: [
        { translateY: (1 - p) * 22 },
        { scale: pop(p) },
        { rotate: `${(1 - p) * (index % 2 ? 8 : -8)}deg` },
      ],
    };
  });
  return <Animated.Text style={[styles.title, style]}>{word}</Animated.Text>;
}

/** Days 1 to 5 as little leaves filling up: the flower is that close. */
function Progress({ streak, time }: { streak: number; time: SharedValue<number> }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: FULL_GROWN }, (_, i) => (
        <Dot key={i} index={i} filled={i < streak} fresh={i === streak - 1} time={time} />
      ))}
    </View>
  );
}

function Dot({
  index,
  filled,
  fresh,
  time,
}: {
  index: number;
  filled: boolean;
  fresh: boolean;
  time: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const appear = ramp(time.value, 1300 + index * 60, 300);
    const fill = fresh ? pop(ramp(time.value, 1700, 350)) : 1;
    return {
      opacity: appear,
      transform: [{ scale: appear * (fresh ? 0.8 + 0.2 * fill : 1) }],
      backgroundColor: filled && fill > 0.5 ? '#7BCB52' : 'rgba(255,255,255,0.14)',
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function Show({ celebration: c }: { celebration: Celebration }) {
  const hide = useCelebration((s) => s.hide);
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const time = useSharedValue(0);
  const shown = useSharedValue(0);
  const grow = useSharedValue(reduced ? c.to : c.from);
  const dry = useSharedValue(c.revive && !reduced ? 1 : 0);
  const glow = useSharedValue(reduced && c.lit ? 1 : 0);
  const leaving = useRef(false);
  const tappable = useRef(false);

  const growAt = c.revive ? 1150 : c.from === 0 ? 700 : 450;

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    shown.value = withTiming(0, { duration: EXIT });
    setTimeout(hide, EXIT);
  };

  useEffect(() => {
    shown.value = withTiming(1, { duration: 280 });
    time.value = withTiming(TOTAL, { duration: TOTAL, easing: Easing.linear });
    if (!reduced) {
      if (c.revive) {
        dry.value = withDelay(650, withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }));
      }
      grow.value = withDelay(
        growAt,
        withTiming(c.to, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      );
      if (c.lit) glow.value = withDelay(growAt + 200, withTiming(1, { duration: 700 }));
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cheer = setTimeout(
      () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      growAt + 700,
    );
    const done = setTimeout(leave, TOTAL - EXIT);
    const grace = setTimeout(() => {
      tappable.current = true;
    }, TAP_GRACE);
    AccessibilityInfo.announceForAccessibility(`${c.title}. ${c.subtitle}`);
    return () => {
      clearTimeout(cheer);
      clearTimeout(done);
      clearTimeout(grace);
    };
    // One show per mount: the host remounts it for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdrop = useAnimatedStyle(() => ({ opacity: shown.value }));
  const stage = useAnimatedStyle(() => {
    const p = ramp(time.value, 0, 520);
    return {
      opacity: shown.value,
      transform: [{ translateY: (1 - p) * 40 }, { scale: 0.55 + 0.45 * pop(p) }],
    };
  });
  const subtitle = useAnimatedStyle(() => {
    const p = ramp(time.value, 1250, 400);
    return { opacity: p, transform: [{ translateY: (1 - p) * 10 }] };
  });
  const hint = useAnimatedStyle(() => ({ opacity: ramp(time.value, 2000, 500) * 0.55 }));

  const plantSize = Math.min(width * 0.68, height * 0.36, 300);
  const plantHeight = (plantSize * 300) / 240;
  const titleAt = growAt + 350;
  const bloom = c.to === FULL_GROWN && c.from < FULL_GROWN;

  const behind = (
    <>
      {c.special === 'rainbow' && !reduced ? <Rainbow time={time} /> : null}
    </>
  );
  const front = reduced ? null : (
    <>
      {c.from === 0 && !c.revive ? <Seed time={time} /> : null}
      {c.revive ? <Drops time={time} /> : null}
      {c.lit ? <Sparkles time={time} glow={glow} /> : null}
      {bloom || c.special ? <Confetti time={time} start={bloom ? growAt + 850 : 900} /> : null}
      {c.special === 'butterflies' ? <Butterflies time={time} /> : null}
      {c.special === 'fruits' ? <Fruits time={time} /> : null}
      {c.special === 'stars' ? <StarShower time={time} /> : null}
    </>
  );

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={leave}
    >
      <Pressable
        style={styles.fill}
        onPress={() => {
          if (tappable.current) leave();
        }}
        accessibilityViewIsModal
        accessibilityRole="button"
        accessibilityLabel={`${c.title}. ${c.subtitle}. Tocca per continuare`}
        testID="plant-celebration"
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="spot" cx="50%" cy="42%" r="55%">
                <Stop offset="0" stopColor={c.lit ? '#FFE9A8' : '#E8F7D8'} stopOpacity={0.3} />
                <Stop offset="1" stopColor="#0B1A12" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={width / 2} cy={height * 0.42} r={Math.max(width, height) * 0.6} fill="url(#spot)" />
          </Svg>
        </Animated.View>

        <View
          style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}
          pointerEvents="none"
        >
          <Animated.View style={[{ width: plantSize, height: plantHeight }, stage]}>
            <Plant
              size={plantSize}
              grow={grow}
              dry={dry}
              glow={glow}
              behind={behind}
              front={front}
            />
          </Animated.View>

          <View style={styles.text}>
            <Badge icon={c.icon} time={time} start={titleAt - 200} />
            <View style={styles.titleRow}>
              {c.title.split(' ').map((word, i) => (
                <Word key={i} word={word} index={i} time={time} start={titleAt} />
              ))}
            </View>
            <Animated.Text style={[styles.subtitle, subtitle]}>{c.subtitle}</Animated.Text>
            {c.streak <= FULL_GROWN ? (
              <Progress streak={c.streak} time={time} />
            ) : (
              <Animated.View style={[styles.chip, subtitle]}>
                <Icon name="flame" size={15} color="#FFB547" />
                <Text style={styles.chipText}>{c.streak} giorni di fila</Text>
              </Animated.View>
            )}
          </View>

          <Animated.Text style={[styles.hint, { bottom: insets.bottom + 24 }, hint]}>Tocca per continuare</Animated.Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(8, 20, 13, 0.95)' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  text: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm, minHeight: 130 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 9,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 210, 63, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 210, 63, 0.45)',
    marginBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 210, 63, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 210, 63, 0.5)',
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#FFE27A' },
  hint: {
    position: 'absolute',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
