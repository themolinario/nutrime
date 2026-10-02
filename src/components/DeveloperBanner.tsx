import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useDeveloperBannerDue } from '../lib/developer';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Body, Muted } from './ui';
import { Icon } from './Icon';

// Dismissing hides it for the rest of this launch only; it comes back on the next Nth one.
let dismissedThisLaunch = false;

/** Every few launches, a card above the tab bar pointing to the developer section. */
export function DeveloperBanner({ bottom }: { bottom: number }) {
  const due = useDeveloperBannerDue();
  const [hidden, setHidden] = useState(dismissedThisLaunch);
  if (!due || hidden) return null;

  const dismiss = () => {
    dismissedThisLaunch = true;
    setHidden(true);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(900).springify()}
      exiting={FadeOutDown}
      style={[styles.wrap, { bottom }]}
      testID="developer-banner"
    >
      <Pressable
        onPress={() => {
          dismiss();
          router.push('/sviluppatore');
        }}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel="Scopri chi ha creato NutriMy"
      >
        <View style={styles.icon}>
          <Icon name="rocket" size={18} color={colors.white} />
        </View>
        <View style={styles.text}>
          <Body style={styles.title}>Hai un’idea per un’app?</Body>
          <Muted style={styles.sub}>Chi ha creato NutriMy può realizzarla per te.</Muted>
        </View>
        <Body style={styles.cta}>Scopri</Body>
      </Pressable>
      <Pressable
        onPress={dismiss}
        hitSlop={10}
        style={styles.close}
        accessibilityLabel="Chiudi"
        testID="developer-banner-close"
      >
        <Icon name="close" size={14} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    ...shadow.raised,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
  sub: { fontSize: 12.5 },
  cta: { fontFamily: fonts.bodySemi, color: colors.green, fontSize: 14 },
  close: {
    position: 'absolute',
    top: -8,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
