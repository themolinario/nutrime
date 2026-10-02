import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isValidQuantity,
  QuantityEditor,
  quantityText,
  quantityValue,
} from '../components/QuantityEditor';
import { Body, Button, Card, Heading, Muted, Overline, Title } from '../components/ui';
import { mealsForDate } from '../lib/diet/parse';
import { parseQuantity } from '../lib/diet/quantity';
import { slotKey } from '../lib/diet/slots';
import { useDietStore } from '../lib/store/useDietStore';
import { accentFor, colors, spacing } from '../theme';
import { Icon } from '../components/Icon';

/**
 * Edit today's quantity of one food: a plan food (`category`) or one added by
 * hand (`food`). Plan foods can go back to the plan's quantity; added ones can
 * be removed.
 */
export default function QuantityScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    date: string;
    meal: string;
    category?: string;
    food?: string;
  }>();
  const date = params.date ?? '';
  const mealKey = params.meal ?? '';

  const plan = useDietStore((s) => s.plan);
  const choiceId = useDietStore((s) =>
    params.category ? s.choices[date]?.[slotKey(mealKey, params.category)] : undefined,
  );
  const override = useDietStore((s) =>
    params.category ? s.qtyOverrides[date]?.[slotKey(mealKey, params.category)] : undefined,
  );
  const addedFood = useDietStore((s) =>
    params.food ? s.added[date]?.[mealKey]?.find((f) => f.id === params.food) : undefined,
  );
  const setQtyOverride = useDietStore((s) => s.setQtyOverride);
  const setAddedQty = useDietStore((s) => s.setAddedQty);
  const removeFood = useDietStore((s) => s.removeFood);

  const target = useMemo(() => {
    if (addedFood) return { name: addedFood.name, planQty: null, current: addedFood.qty };
    if (!plan || !params.category) return null;
    const meal = mealsForDate(plan, date).find((m) => m.key === mealKey);
    const option = meal?.categories
      .find((c) => c.id === params.category)
      ?.options.find((o) => o.id === choiceId);
    return option
      ? { name: option.name, planQty: option.qty.raw, current: override ?? option.qty.raw }
      : null;
  }, [addedFood, plan, params.category, date, mealKey, choiceId, override]);

  const [value, setValue] = useState(() => quantityValue(target?.current ?? 'g 100'));

  if (!target) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Body>Questo alimento non c’è più.</Body>
        <Button label="Chiudi" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const done = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const onSave = () => {
    if (!isValidQuantity(value)) return;
    const text = quantityText(value);
    if (params.food) setAddedQty(date, mealKey, params.food, text);
    else if (params.category)
      setQtyOverride(date, mealKey, params.category, text === target.planQty ? null : text);
    done();
  };

  const accent = accentFor(mealKey);

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Overline style={{ color: accent.tint }}>Solo per oggi</Overline>
            <Title style={styles.headerTitle}>Cambia quantità</Title>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Chiudi"
            testID="qty-close"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.food}>
          <Heading style={styles.foodName}>{target.name}</Heading>
          <Muted>
            {target.planQty
              ? `Nel piano: ${target.planQty}${override ? ` · oggi: ${override}` : ''}`
              : 'Aggiunto da te oggi'}
          </Muted>
        </Card>

        <QuantityEditor
          value={value}
          onChange={setValue}
          extraUnit={target.planQty ? (parseQuantity(target.planQty)?.unit ?? null) : null}
        />

        <Button
          label="Salva"
          icon="checkmark"
          onPress={onSave}
          disabled={!isValidQuantity(value)}
          testID="qty-save"
        />
        {target.planQty && override ? (
          <Button
            label={`Torna a ${target.planQty}`}
            icon="refresh-outline"
            variant="ghost"
            onPress={() => {
              setQtyOverride(date, mealKey, params.category!, null);
              done();
            }}
            testID="qty-reset"
          />
        ) : null}
        {params.food ? (
          <Button
            label="Togli dal pasto"
            icon="trash-outline"
            variant="danger"
            onPress={() => {
              removeFood(date, mealKey, params.food!);
              done();
            }}
            testID="qty-remove"
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 22 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  food: { padding: spacing.lg, gap: 2 },
  foodName: { fontSize: 17 },
});
