import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { parseQuantity } from '../lib/diet/quantity';
import { colors, fonts, radius, spacing } from '../theme';
import { Body, Muted } from './ui';
import { Icon } from './Icon';

export type QuantityValue = { amount: string; unit: string };

const WEIGHT_UNITS = ['g', 'kg', 'ml', 'l', 'cl', 'dl', 'mg'];
const BASE_UNITS = ['g', 'ml', 'pz'];

/** `g 120` → `{ amount: '120', unit: 'g' }`; unreadable text starts at 100 g. */
export function quantityValue(raw: string): QuantityValue {
  const q = parseQuantity(raw);
  if (!q || q.amount === null) return { amount: '100', unit: 'g' };
  return { amount: `${q.amount}`.replace('.', ','), unit: q.unit ?? 'pz' };
}

/**
 * Back to the plan's own notation — unit first for weights (`g 150`), number
 * first otherwise (`2 vasetto`) — so the shopping list can still add them up.
 */
export function quantityText({ amount, unit }: QuantityValue): string {
  const n = amount.trim();
  return WEIGHT_UNITS.includes(unit) ? `${unit} ${n}` : `${n} ${unit}`;
}

export function isValidQuantity({ amount }: QuantityValue): boolean {
  const n = Number(amount.replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}

/** Big number field, ± steps and unit chips (the food's own unit included). */
export function QuantityEditor({
  value,
  onChange,
  extraUnit,
}: {
  value: QuantityValue;
  onChange: (value: QuantityValue) => void;
  /** A unit from the plan (e.g. `vasetto`) to offer beside g/ml/pz. */
  extraUnit?: string | null;
}) {
  const units = [...BASE_UNITS];
  for (const u of [extraUnit, value.unit]) if (u && !units.includes(u)) units.push(u);
  const step = WEIGHT_UNITS.includes(value.unit)
    ? value.unit === 'kg' || value.unit === 'l'
      ? 0.1
      : 10
    : 1;

  const bump = (direction: 1 | -1) => {
    const current = Number(value.amount.replace(',', '.')) || 0;
    const next = Math.max(step, Math.round((current + direction * step) * 10) / 10);
    void Haptics.selectionAsync();
    onChange({ ...value, amount: `${next}`.replace('.', ',') });
  };

  return (
    <View style={styles.root}>
      <View style={styles.amountRow}>
        <Pressable
          onPress={() => bump(-1)}
          style={styles.step}
          accessibilityLabel="Diminuisci"
          testID="qty-minus"
        >
          <Icon name="remove" size={22} color={colors.green} />
        </Pressable>
        <View style={styles.amountBox}>
          <TextInput
            value={value.amount}
            onChangeText={(amount) =>
              onChange({ ...value, amount: amount.replace(/[^0-9.,]/g, '') })
            }
            keyboardType="decimal-pad"
            style={styles.amount}
            selectTextOnFocus
            accessibilityLabel="Quantità"
            testID="qty-amount"
          />
          <Body style={styles.unit}>{value.unit}</Body>
        </View>
        <Pressable
          onPress={() => bump(1)}
          style={styles.step}
          accessibilityLabel="Aumenta"
          testID="qty-plus"
        >
          <Icon name="add" size={22} color={colors.green} />
        </Pressable>
      </View>

      <View style={styles.units}>
        {units.map((unit) => {
          const active = unit === value.unit;
          return (
            <Pressable
              key={unit}
              onPress={() => onChange({ ...value, unit })}
              style={[styles.chip, active && styles.chipActive]}
              testID={`qty-unit-${unit}`}
            >
              <Body style={[styles.chipText, active && styles.chipTextActive]}>{unit}</Body>
            </Pressable>
          );
        })}
      </View>
      <Muted style={styles.hint}>Usa ± oppure scrivi il numero che preferisci.</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBox: {
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amount: {
    minWidth: 60,
    textAlign: 'right',
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.text,
    padding: 0,
  },
  unit: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.textMuted },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13.5, fontFamily: fonts.bodyMedium, color: colors.textMuted },
  chipTextActive: { color: colors.white, fontFamily: fonts.bodySemi },
  hint: { fontSize: 12, textAlign: 'center' },
});
