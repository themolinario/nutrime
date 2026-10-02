import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays } from '../lib/dates';
import { useDietStore } from '../lib/store/useDietStore';
import { useToday } from '../lib/useToday';
import { formatDelta, formatKg, weightEntries, weightOn } from '../lib/weight';
import { colors, fonts, radius, spacing } from '../theme';
import { Icon } from './Icon';
import { Body, Muted } from './ui';

/** Today's weight on the Oggi tab, and the way into the weight screen. */
export function WeightCard() {
  const today = useToday();
  const weights = useDietStore((s) => s.weights);
  const entries = useMemo(() => weightEntries(weights), [weights]);

  const todayKg = weights[today];
  const before = weightOn(entries, addDays(today, -1));
  const subtitle =
    todayKg !== undefined
      ? before
        ? `${formatDelta(todayKg - before.kg)} kg dall’ultima pesata`
        : 'Prima pesata registrata'
      : before
        ? `Ultima: ${formatKg(before.kg)} kg · tocca per registrare`
        : 'Tocca per registrare e vedere l’andamento';

  return (
    <Pressable
      onPress={() => router.push('/peso')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        todayKg !== undefined ? `Peso di oggi ${formatKg(todayKg)} chili` : 'Registra il peso di oggi'
      }
      testID="weight-card"
    >
      <View style={styles.icon}>
        <Icon name="scales" size={20} color={colors.plum} />
      </View>
      <View style={styles.text}>
        <Body style={styles.title}>
          {todayKg !== undefined ? `Oggi ${formatKg(todayKg)} kg` : 'Peso di oggi'}
        </Body>
        <Muted>{subtitle}</Muted>
      </View>
      <Icon name="chart-line" size={18} color={colors.textMuted} />
      <Icon name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.plumSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
