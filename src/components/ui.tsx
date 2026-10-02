import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native';

import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Icon, type IconName } from './Icon';

/* -------------------------------------------------------------------------- */
/* Typography                                                                 */
/* -------------------------------------------------------------------------- */

type TypeProps = TextProps & { children: React.ReactNode };

export function Display({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.display, style]} />;
}

export function Title({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function Heading({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.heading, style]} />;
}

export function Body({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function Muted({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.muted, style]} />;
}

export function Overline({ style, ...props }: TypeProps) {
  return <Text {...props} style={[styles.overline, style]} />;
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

export function Divider({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.divider, style]} />;
}

/** Small rounded label, used for quantities and day names. */
export function Pill({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: 'neutral' | 'green' | 'terracotta' | 'amber' | 'plum';
  style?: ViewProps['style'];
}) {
  const tones = {
    neutral: { bg: colors.bgSunken, fg: colors.textMuted },
    green: { bg: colors.greenSoft, fg: colors.green },
    terracotta: { bg: colors.terracottaSoft, fg: colors.terracotta },
    amber: { bg: colors.amberSoft, fg: '#9A6708' },
    plum: { bg: colors.plumSoft, fg: colors.plum },
  } as const;
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.pillText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  style?: ViewProps['style'];
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  style,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const palette = {
    primary: { bg: colors.green, fg: colors.white, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.green, border: colors.greenBorder },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
    danger: { bg: colors.terracottaSoft, fg: colors.danger, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={(event) => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={palette.fg} /> : null}
      <Text
        style={[styles.buttonLabel, size === 'sm' && styles.buttonLabelSm, { color: palette.fg }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Round checkbox used for "eaten" and "in the basket". */
export function CheckCircle({
  checked,
  tint = colors.green,
  size = 26,
}: {
  checked: boolean;
  tint?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.check,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: checked ? tint : 'transparent',
          borderColor: checked ? tint : colors.borderStrong,
        },
      ]}
    >
      {checked ? <Icon name="checkmark" size={size * 0.62} color={colors.white} /> : null}
    </View>
  );
}

/** Thin horizontal progress bar. */
export function ProgressBar({
  value,
  tint = colors.green,
  track = colors.bgSunken,
  height = 6,
}: {
  value: number;
  tint?: string;
  track?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.progressTrack, { backgroundColor: track, height, borderRadius: height }]}>
      <View
        style={[
          styles.progressFill,
          { backgroundColor: tint, width: `${pct * 100}%`, borderRadius: height },
        ]}
      />
    </View>
  );
}

/** Centred illustration + message for empty screens. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.green} />
      </View>
      <Title style={styles.emptyTitle}>{title}</Title>
      <Muted style={styles.emptyMessage}>{message}</Muted>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 37,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  overline: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonSm: {
    height: 38,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  buttonLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  buttonLabelSm: {
    fontSize: 13,
  },
  check: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: spacing.xl,
  },
});
