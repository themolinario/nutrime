import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Heading, Muted, Overline, Title } from '../components/ui';
import { mealsForDate } from '../lib/diet/parse';
import { norm } from '../lib/diet/text';
import type { FoodOption } from '../lib/diet/types';
import { slotKey } from '../lib/diet/slots';
import { useDietStore } from '../lib/store/useDietStore';
import { accentFor, colors, fonts, radius, spacing } from '../theme';
import { Icon } from '../components/Icon';

export default function ChooseScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string; meal: string; category: string }>();
  const date = params.date ?? '';
  const mealKey = params.meal ?? '';
  const categoryId = params.category ?? '';

  const plan = useDietStore((s) => s.plan);
  const chosenId = useDietStore((s) => s.choices[date]?.[slotKey(mealKey, categoryId)]);
  const choose = useDietStore((s) => s.choose);
  const clearChoice = useDietStore((s) => s.clearChoice);

  const [query, setQuery] = useState('');

  const context = useMemo(() => {
    if (!plan || !date) return null;
    const meal = mealsForDate(plan, date).find((m) => m.key === mealKey);
    const category = meal?.categories.find((c) => c.id === categoryId);
    return meal && category ? { meal, category } : null;
  }, [plan, date, mealKey, categoryId]);

  const options = useMemo(() => {
    if (!context) return [];
    const q = norm(query);
    if (!q) return context.category.options;
    return context.category.options.filter((o) => norm(o.name).includes(q));
  }, [context, query]);

  if (!context) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Body>Questa scelta non è più disponibile.</Body>
        <Button label="Chiudi" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const accent = accentFor(context.meal.key);

  const onSelect = (option: FoodOption) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    choose(date, mealKey, categoryId, option.id);
    router.back();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Overline style={{ color: accent.tint }}>{context.meal.name}</Overline>
            <Title style={styles.headerTitle}>{context.category.name}</Title>
            <Muted>Scegline uno. Cambiarlo nei vari giorni rende tutto più vario!</Muted>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Chiudi"
            testID="choose-close"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {context.category.options.length > 8 ? (
          <View style={styles.search}>
            <Icon name="search" size={16} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca un alimento"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
              autoCorrect={false}
              testID="choose-search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="close-circle" size={16} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        testID="choose-list"
        ListEmptyComponent={
          <View style={styles.centered}>
            <Muted>Nessun alimento trovato.</Muted>
          </View>
        }
        renderItem={({ item }) => {
          const selected = item.id === chosenId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.option,
                selected && { borderColor: accent.tint, backgroundColor: accent.soft },
                pressed && !selected && styles.optionPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              testID={`option-${item.id}`}
            >
              <View style={styles.optionText}>
                <Heading style={[styles.optionName, selected && { color: accent.tint }]}>
                  {item.name}
                </Heading>
                {item.components?.length ? (
                  <Muted style={styles.componentList}>
                    {item.components.map((c) => `${c.name} · ${c.qty.raw}`).join('\n')}
                  </Muted>
                ) : null}
              </View>
              <View style={styles.optionEnd}>
                <Body style={[styles.optionQty, selected && { color: accent.tint }]}>
                  {item.qty.raw}
                </Body>
                {selected ? (
                  <Icon name="checkmark-circle" size={20} color={accent.tint} />
                ) : (
                  <View style={styles.radio} />
                )}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          chosenId ? (
            <Button
              label="Rimuovi la scelta"
              icon="trash-outline"
              variant="danger"
              size="sm"
              style={styles.remove}
              onPress={() => {
                clearChoice(date, mealKey, categoryId);
                router.back();
              }}
              testID="choose-clear"
            />
          ) : null
        }
      />
    </View>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSunken,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionText: { flex: 1 },
  optionName: { fontSize: 15.5 },
  componentList: { marginTop: 4, fontSize: 12.5, lineHeight: 17 },
  optionEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionQty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  remove: { marginTop: spacing.lg, alignSelf: 'center' },
});
