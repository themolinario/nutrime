import { useFocusEffect } from 'expo-router';
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';

import { dismissTip, registerTip, showTipNow, useTipStore, type TipRect } from '../lib/tips';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Body } from './ui';

/** How long a tip stays up if left alone. */
const AUTO_HIDE_MS = 6000;
const ARROW = 8;
const GAP = 6;

/**
 * Marks what a tip points at. The tip shows once, the first time its screen is
 * open, and comes back with a long press on the element.
 */
export function TipAnchor({
  id,
  text,
  order = 0,
  style,
  children,
}: {
  id: string;
  text: string;
  order?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactElement;
}) {
  // Held in state rather than a ref: the long-press handler built during render reads it.
  const [node, setNode] = useState<View | null>(null);

  const measure = useCallback(
    () =>
      new Promise<TipRect | null>((resolve) => {
        if (!node) return resolve(null);
        node.measureInWindow((x, y, width, height) =>
          resolve(width || height ? { x, y, width, height } : null),
        );
      }),
    [node],
  );

  useFocusEffect(
    useCallback(() => registerTip({ id, text, order, measure }), [id, text, order, measure]),
  );
  const replay = useCallback(() => void showTipNow({ id, text, measure }), [id, text, measure]);

  // Pressables get the long press that brings the tip back.
  const child = Children.only(children);
  const pressable =
    isValidElement<{ onPress?: unknown; onLongPress?: unknown }>(child) &&
    child.props.onPress &&
    !child.props.onLongPress;

  return (
    <View ref={setNode} collapsable={false} style={style}>
      {pressable
        ? cloneElement(child as ReactElement<{ onLongPress: () => void }>, { onLongPress: replay })
        : child}
    </View>
  );
}

/** Draws the current tip above everything; mounted once at the root. */
export function TipHost() {
  const tip = useTipStore((s) => s.current);
  const { width: screenW, height: screenH } = useWindowDimensions();

  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(dismissTip, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [tip]);

  if (!tip) return null;

  const { rect } = tip;
  const bubbleW = Math.min(280, screenW - spacing.lg * 2);
  const centerX = rect.x + rect.width / 2;
  const left = Math.min(
    Math.max(centerX - bubbleW / 2, spacing.lg),
    screenW - spacing.lg - bubbleW,
  );
  const arrowLeft = Math.min(
    Math.max(centerX - left - ARROW, radius.md),
    bubbleW - radius.md - ARROW * 2,
  );
  // Below the anchor, unless it sits in the lower part of the screen.
  const below = rect.y + rect.height / 2 < screenH * 0.6;
  const placement = below
    ? { top: rect.y + rect.height + GAP + ARROW }
    : { bottom: screenH - rect.y + GAP + ARROW };

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={dismissTip}
      accessibilityRole="button"
      accessibilityLabel={`${tip.text} Tocca per chiudere.`}
      testID="tip"
    >
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          { left: rect.x - 4, top: rect.y - 4, width: rect.width + 8, height: rect.height + 8 },
        ]}
      />
      <Animated.View
        key={tip.id}
        entering={(below ? FadeInDown : FadeInUp).duration(220)}
        exiting={FadeOut.duration(150)}
        pointerEvents="none"
        style={[styles.bubble, placement, { left, width: bubbleW }]}
      >
        <View
          style={[styles.arrow, { left: arrowLeft }, below ? styles.arrowUp : styles.arrowDown]}
        />
        <Body style={styles.text}>{tip.text}</Body>
        <Body style={styles.hint}>Tocca per chiudere</Body>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.amber,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: colors.greenDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
    ...shadow.raised,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: { top: -ARROW, borderBottomWidth: ARROW, borderBottomColor: colors.greenDeep },
  arrowDown: { bottom: -ARROW, borderTopWidth: ARROW, borderTopColor: colors.greenDeep },
  text: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  hint: { color: '#A9CDB8', fontSize: 11.5 },
});
