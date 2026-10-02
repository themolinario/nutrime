import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealCard, type QtyTarget } from '../../components/MealCard';
import { PlantBadge } from '../../components/plant/PlantBadge';
import { WeightCard } from '../../components/WeightCard';
import { TipAnchor } from '../../components/Tip';
import {
  Body,
  Button,
  Card,
  Display,
  Muted,
  Overline,
  ProgressBar,
  Title,
} from '../../components/ui';
import { track } from '../../lib/analytics';
import { formatDayMonth, weekdayName } from '../../lib/dates';
import { confirmAutoFill } from '../../lib/diet/confirmAutoFill';
import { cycleWeek, hasChoices, mealsForDate } from '../../lib/diet/parse';
import { buildDayHtml, buildDayMessage, dayPdfName } from '../../lib/export/menu';
import { showExportMenu } from '../../lib/export/share';
import { mealEntries } from '../../lib/diet/day';
import { slotKey } from '../../lib/diet/slots';
import type { FoodCategory, ResolvedMeal } from '../../lib/diet/types';
import { dayProgress, useDayExtras, useDietStore } from '../../lib/store/useDietStore';
import { useToday } from '../../lib/useToday';
import { colors, fonts, radius, spacing } from '../../theme';
import { Icon } from '../../components/Icon';

/** A hello that fits the time of day. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Buonanotte';
  if (hour < 12) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  // Follows the calendar: the tab stays mounted in the background across midnight.
  const date = useToday();

  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices[date]);
  const eaten = useDietStore((s) => s.eaten[date]);
  const toggleEaten = useDietStore((s) => s.toggleEaten);
  const setMealEaten = useDietStore((s) => s.setMealEaten);
  const extras = useDayExtras(date);
  const clearDay = useDietStore((s) => s.clearDay);
  const hasReminders = useDietStore((s) => Object.keys(s.reminders).length > 0);

  const meals = useMemo(() => (plan ? mealsForDate(plan, date) : []), [plan, date]);
  const progress = useMemo(
    () => dayProgress(meals, choices, eaten, extras),
    [meals, choices, eaten, extras],
  );

  const onPick = useCallback(
    (meal: ResolvedMeal, category: FoodCategory) => {
      router.push({
        pathname: '/scegli',
        params: { date, meal: meal.key, category: category.id },
      });
    },
    [date],
  );

  const onToggle = useCallback(
    (meal: ResolvedMeal, categoryId: string) => {
      // The tick that completes the day: the plant celebrates it (see usePlantCelebrations).
      const ticking = !eaten?.[slotKey(meal.key, categoryId)];
      if (ticking && progress.done + 1 === progress.total) {
        track('day_completed', { foods: progress.total });
      }
      toggleEaten(date, meal.key, categoryId);
    },
    [date, eaten, progress, toggleEaten],
  );

  const onToggleMeal = useCallback(
    (meal: ResolvedMeal, value: boolean) => {
      const left = mealEntries(meal, choices, eaten, extras).filter((e) => !e.done).length;
      if (value && left > 0 && progress.done + left === progress.total) {
        track('day_completed', { foods: progress.total });
      }
      setMealEaten(date, meal.key, value);
    },
    [date, choices, eaten, extras, progress, setMealEaten],
  );

  const onEditQty = useCallback(
    (meal: ResolvedMeal, target: QtyTarget) =>
      router.push({
        pathname: '/quantita',
        params:
          'food' in target
            ? { date, meal: meal.key, food: target.food.id }
            : { date, meal: meal.key, category: target.category.id },
      }),
    [date],
  );

  const onAddFood = useCallback(
    (meal: ResolvedMeal) =>
      router.push({ pathname: '/aggiungi', params: { date, meal: meal.key } }),
    [date],
  );

  const onShare = () =>
    showExportMenu({
      kind: 'day',
      title: 'Condividi il menu di oggi',
      message: () => buildDayMessage(date, meals, choices, extras),
      html: () => buildDayHtml(date, meals, choices, extras),
      fileName: dayPdfName(date),
    });

  const ratio = progress.total ? progress.done / progress.total : 0;
  const allChosen = progress.total > 0 && progress.chosen === progress.total;
  // Plans that fix every course leave nothing to fill in or reset.
  const canChoose = hasChoices(meals);
  const week = plan ? cycleWeek(plan, date) : undefined;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      testID="today-scroll"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Overline>
            {`${greeting()} · ${formatDayMonth(date)}${week ? ` · ${week}ª settimana` : ''}`}
          </Overline>
          <Display
            style={styles.title}
            accessibilityRole="header"
            accessible
            accessibilityLabel={`${weekdayName(date)} ${formatDayMonth(date)}`}
            testID="today-title"
          >
            {weekdayName(date)}
          </Display>
        </View>
        <TipAnchor
          id="oggi-reminders"
          order={1}
          text="Promemoria: all’ora di ogni pasto ti arriva una notifica con il menu. Scegli tu per quali pasti."
        >
          <Pressable
            onPress={() => router.push('/promemoria')}
            hitSlop={10}
            style={styles.badge}
            accessibilityLabel="Promemoria dei pasti"
            testID="today-reminders"
          >
            <Icon
              name={hasReminders ? 'notifications' : 'notifications-outline'}
              size={18}
              color={colors.green}
            />
          </Pressable>
        </TipAnchor>
        {progress.chosen > 0 ? (
          <TipAnchor
            id="oggi-share"
            order={2}
            text="Condividi il menu di oggi su WhatsApp o salvalo in PDF."
          >
            <Pressable
              onPress={onShare}
              hitSlop={10}
              style={styles.badge}
              accessibilityLabel="Condividi il menu di oggi"
              testID="today-share"
            >
              <Icon name="share-outline" size={19} color={colors.green} />
            </Pressable>
          </TipAnchor>
        ) : (
          <View style={styles.badge}>
            <Icon name="leaf" size={15} color={colors.green} />
          </View>
        )}
      </View>

      {meals.length > 0 ? <PlantBadge /> : null}
      <WeightCard />

      <Card style={styles.summary} testID="today-summary">
        <View style={styles.summaryTop}>
          <View style={styles.summaryText}>
            <Title
              style={styles.summaryTitle}
              accessible
              accessibilityLabel={`${progress.done} di ${progress.total} completati, ${progress.chosen} scelti`}
              testID="today-progress"
            >
              {progress.done} di {progress.total} completati
            </Title>
            <Muted>
              {progress.chosen < progress.total
                ? `${progress.total - progress.chosen} da scegliere`
                : progress.done === progress.total
                  ? 'Giornata completata, grande!'
                  : 'Menu pronto: spunta man mano che mangi.'}
            </Muted>
          </View>
          <Title style={[styles.percent, ratio === 1 && { color: colors.green }]}>
            {Math.round(ratio * 100)}%
          </Title>
        </View>
        <ProgressBar value={ratio} />
        {canChoose ? (
          <View style={styles.summaryActions}>
            <TipAnchor
              id="oggi-autofill"
              order={3}
              text="Sceglie in un tocco tutti gli alimenti di oggi, variando rispetto agli altri giorni. Puoi sempre cambiarli."
            >
              <Button
                label={allChosen ? 'Rigenera scelte' : 'Compila per me'}
                icon="sparkles-outline"
                variant="secondary"
                size="sm"
                onPress={() => confirmAutoFill([date], allChosen)}
                testID="today-autofill"
              />
            </TipAnchor>
            {progress.chosen > 0 ? (
              <Button
                label="Azzera"
                icon="refresh-outline"
                variant="ghost"
                size="sm"
                onPress={() => clearDay(date)}
                testID="today-clear"
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      {meals.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Body>Nessun pasto previsto dal piano per {weekdayName(date).toLowerCase()}.</Body>
        </Card>
      ) : (
        <View style={styles.meals}>
          {meals.map((meal) => (
            <MealCard
              key={meal.key}
              meal={meal}
              choices={choices}
              eaten={eaten}
              extras={extras}
              onPickCategory={onPick}
              onToggleEaten={onToggle}
              onToggleMeal={onToggleMeal}
              editable
              onEditQty={onEditQty}
              onAddFood={onAddFood}
              qtyTip
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  headerText: { flex: 1 },
  title: { marginTop: 2 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summary: { padding: spacing.lg, gap: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryText: { flex: 1 },
  summaryTitle: { fontFamily: fonts.bodySemi, fontSize: 16, marginBottom: 2 },
  percent: { fontFamily: fonts.display, fontSize: 26, color: colors.textFaint },
  summaryActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  meals: { gap: spacing.md },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg },
});
