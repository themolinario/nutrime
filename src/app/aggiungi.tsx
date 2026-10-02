import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isValidQuantity,
  QuantityEditor,
  quantityText,
  quantityValue,
  type QuantityValue,
} from '../components/QuantityEditor';
import { Body, Button, Card, Heading, Muted, Overline, Title } from '../components/ui';
import { mealsForDate } from '../lib/diet/parse';
import { parseQuantity } from '../lib/diet/quantity';
import { searchOpenFoodFacts, searchPlanFoods, type FoodSuggestion } from '../lib/foods/search';
import { useDietStore } from '../lib/store/useDietStore';
import { accentFor, colors, fonts, radius, spacing } from '../theme';
import { Icon, type IconName } from '../components/Icon';

type Picked = { name: string; qty: string; suggestion: FoodSuggestion | null };

/** Grams (or ml) in a quantity, for the kcal estimate; null for pieces and the like. */
function grams(value: QuantityValue): number | null {
  const n = Number(value.amount.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (value.unit === 'g' || value.unit === 'ml') return n;
  if (value.unit === 'kg' || value.unit === 'l') return n * 1000;
  return null;
}

/** Add a food to one meal of today: from the plan, Open Food Facts or typed in. */
export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const { date = '', meal: mealKey = '' } = useLocalSearchParams<{ date: string; meal: string }>();
  const plan = useDietStore((s) => s.plan);
  const addFood = useDietStore((s) => s.addFood);

  const meal = useMemo(
    () => (plan && date ? mealsForDate(plan, date).find((m) => m.key === mealKey) : undefined),
    [plan, date, mealKey],
  );

  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<FoodSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [qty, setQty] = useState<QuantityValue>({ amount: '100', unit: 'g' });

  const fromPlan = useMemo(() => searchPlanFoods(plan, query), [plan, query]);
  // Results of an older, longer query stay hidden once the text gets too short.
  const results = query.trim().length >= 3 ? online : [];

  // Ask Open Food Facts once typing pauses; drop answers to stale queries.
  useEffect(() => {
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchOpenFoodFacts(query, controller.signal)
        .then((results) => {
          setOnline(results);
          setOffline(false);
        })
        .catch((error) => {
          if ((error as Error).name !== 'AbortError') setOffline(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (name: string, startQty: string, suggestion: FoodSuggestion | null) => {
    void Haptics.selectionAsync();
    setPicked({ name, qty: startQty, suggestion });
    setQty(quantityValue(startQty));
  };

  const onAdd = () => {
    if (!picked || !isValidQuantity(qty)) return;
    addFood(date, mealKey, {
      name: picked.name,
      qty: quantityText(qty),
      source: picked.suggestion?.source ?? 'custom',
      brand: picked.suggestion?.source === 'openfoodfacts' ? picked.suggestion.detail : null,
      kcal100: picked.suggestion?.kcal100 ?? null,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const accent = accentFor(mealKey);
  const kcal =
    picked?.suggestion?.kcal100 != null && grams(qty) != null
      ? Math.round((picked.suggestion.kcal100 * grams(qty)!) / 100)
      : null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Overline style={{ color: accent.tint }}>{meal?.name ?? 'Pasto'} · solo oggi</Overline>
            <Title style={styles.headerTitle}>
              {picked ? 'Quanto ne mangi?' : 'Aggiungi un alimento'}
            </Title>
          </View>
          <Pressable
            onPress={() => (picked ? setPicked(null) : router.back())}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel={picked ? 'Indietro' : 'Chiudi'}
            testID="add-close"
          >
            <Icon name={picked ? 'arrow-back' : 'close'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {!picked ? (
          <View style={styles.search}>
            <Icon name="search" size={17} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setLoading(text.trim().length >= 3);
              }}
              placeholder="Cerca: yogurt, gallette, mela…"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              testID="add-search"
            />
            {query ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setLoading(false);
                }}
                hitSlop={8}
                accessibilityLabel="Cancella"
              >
                <Icon name="close-circle" size={17} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {picked ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.pickedCard}>
            <Heading style={styles.pickedName}>{picked.name}</Heading>
            <Muted>
              {picked.suggestion?.source === 'plan'
                ? `Dal tuo piano · ${picked.suggestion.detail}`
                : picked.suggestion?.source === 'openfoodfacts'
                  ? [picked.suggestion.detail, 'Open Food Facts'].filter(Boolean).join(' · ')
                  : 'Alimento personalizzato'}
            </Muted>
          </Card>
          <QuantityEditor
            value={qty}
            onChange={setQty}
            extraUnit={parseQuantity(picked.qty)?.unit ?? null}
          />
          {kcal !== null ? (
            <Card style={styles.kcal}>
              <Icon name="flame-outline" size={17} color={colors.terracotta} />
              <Body style={styles.kcalText}>
                Circa <Body style={styles.kcalValue}>{kcal} kcal</Body> (
                {picked.suggestion?.kcal100} kcal ogni 100 g)
              </Body>
            </Card>
          ) : null}
          <Button
            label={`Aggiungi a ${meal?.name.toLowerCase() ?? 'questo pasto'}`}
            icon="add-circle-outline"
            onPress={onAdd}
            disabled={!isValidQuantity(qty)}
            testID="add-confirm"
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {query.trim().length < 2 ? (
            <View style={styles.empty}>
              <Icon name="nutrition-outline" size={30} color={colors.greenBorder} />
              <Body style={styles.emptyText}>
                Cerca tra i cibi del tuo piano e tra migliaia di prodotti del supermercato, oppure
                scrivi quello che vuoi e aggiungilo a mano.
              </Body>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => choose(query.trim(), 'g 100', null)}
                style={({ pressed }) => [pressed && styles.pressed]}
                testID="add-custom"
              >
                <Card style={styles.custom}>
                  <View style={styles.customIcon}>
                    <Icon name="create-outline" size={18} color={colors.white} />
                  </View>
                  <View style={styles.rowText}>
                    <Heading numberOfLines={1}>Aggiungi «{query.trim()}»</Heading>
                    <Muted>Come alimento personalizzato</Muted>
                  </View>
                  <Icon name="chevron-forward" size={16} color={colors.textFaint} />
                </Card>
              </Pressable>

              {fromPlan.length ? (
                <Section title="Dal tuo piano" icon="leaf-outline">
                  {fromPlan.map((s) => (
                    <SuggestionRow
                      key={s.key}
                      suggestion={s}
                      onPress={() => choose(s.name, s.qty, s)}
                    />
                  ))}
                </Section>
              ) : null}

              <Section
                title="Dal supermercato"
                icon="basket-outline"
                note="Dati di Open Food Facts, il database aperto degli alimenti"
              >
                {loading ? (
                  <ActivityIndicator color={colors.green} style={styles.loading} />
                ) : offline ? (
                  <Muted style={styles.sectionEmpty}>
                    Nessuna connessione: puoi comunque aggiungerlo a mano.
                  </Muted>
                ) : results.length ? (
                  results.map((s) => (
                    <SuggestionRow
                      key={s.key}
                      suggestion={s}
                      onPress={() => choose(s.name, s.qty, s)}
                    />
                  ))
                ) : (
                  <Muted style={styles.sectionEmpty}>
                    {query.trim().length < 3
                      ? 'Scrivi ancora qualche lettera…'
                      : 'Nessun prodotto trovato.'}
                  </Muted>
                )}
              </Section>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  icon,
  note,
  children,
}: {
  title: string;
  icon: IconName;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={14} color={colors.textMuted} />
        <Overline>{title}</Overline>
      </View>
      <Card style={styles.sectionCard}>{children}</Card>
      {note ? <Muted style={styles.note}>{note}</Muted> : null}
    </View>
  );
}

function SuggestionRow({
  suggestion,
  onPress,
}: {
  suggestion: FoodSuggestion;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
      testID={`add-suggestion-${suggestion.key}`}
    >
      <View style={styles.rowText}>
        <Body style={styles.suggestionName} numberOfLines={2}>
          {suggestion.name}
        </Body>
        {suggestion.detail ? (
          <Muted style={styles.suggestionDetail} numberOfLines={1}>
            {suggestion.detail}
          </Muted>
        ) : null}
      </View>
      <Muted style={styles.suggestionMeta}>
        {suggestion.source === 'plan'
          ? suggestion.qty
          : suggestion.kcal100 != null
            ? `${suggestion.kcal100} kcal/100 g`
            : ''}
      </Muted>
      <Icon name="add-circle" size={22} color={colors.green} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
    height: 42,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, padding: 0 },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: { textAlign: 'center', color: colors.textMuted, lineHeight: 21 },
  pressed: { opacity: 0.7 },
  custom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  customIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 1 },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: spacing.xs },
  sectionCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sectionEmpty: { paddingVertical: spacing.md, textAlign: 'center' },
  loading: { paddingVertical: spacing.lg },
  note: { fontSize: 11.5, marginLeft: spacing.xs },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionName: { fontSize: 14.5, fontFamily: fonts.bodyMedium },
  suggestionDetail: { fontSize: 12 },
  suggestionMeta: { fontSize: 12 },
  pickedCard: { padding: spacing.lg, gap: 2 },
  pickedName: { fontSize: 17 },
  kcal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.terracottaSoft,
    borderColor: 'transparent',
  },
  kcalText: { flex: 1, fontSize: 13.5 },
  kcalValue: { fontFamily: fonts.bodySemi, fontSize: 13.5 },
});
