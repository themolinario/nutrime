import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealCard } from '../../components/MealCard';
import { Body, Button, Card, Display, Muted, Overline, ProgressBar } from '../../components/ui';
import { formatDayMonth, relativeDayLabel, weekdayName } from '../../lib/dates';
import { confirmAutoFill } from '../../lib/diet/confirmAutoFill';
import { mealsForDate } from '../../lib/diet/parse';
import { buildDayHtml, buildDayMessage, dayPdfName } from '../../lib/export/menu';
import { showExportMenu } from '../../lib/export/share';
import type { FoodCategory, ResolvedMeal } from '../../lib/diet/types';
import { dayProgress, useDayExtras, useDietStore } from '../../lib/store/useDietStore';
import { colors, fonts, spacing } from '../../theme';
import { Icon } from '../../components/Icon';

export default function DayScreen() {
  const insets = useSafeAreaInsets();
  const { date = '' } = useLocalSearchParams<{ date: string }>();

  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices[date]);
  const eaten = useDietStore((s) => s.eaten[date]);
  const toggleEaten = useDietStore((s) => s.toggleEaten);
  const setMealEaten = useDietStore((s) => s.setMealEaten);
  const extras = useDayExtras(date);
  const fillSingleOptions = useDietStore((s) => s.fillSingleOptions);

  // Days outside the planning window get their single-food tables filled on opening.
  useEffect(() => {
    if (date) fillSingleOptions([date]);
  }, [date, fillSingleOptions]);
  const clearDay = useDietStore((s) => s.clearDay);

  const meals = useMemo(() => (plan && date ? mealsForDate(plan, date) : []), [plan, date]);
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
    (meal: ResolvedMeal, categoryId: string) => toggleEaten(date, meal.key, categoryId),
    [date, toggleEaten],
  );

  const onToggleMeal = useCallback(
    (meal: ResolvedMeal, value: boolean) => setMealEaten(date, meal.key, value),
    [date, setMealEaten],
  );

  const onShare = () =>
    showExportMenu({
      kind: 'day',
      title: `Condividi il menu di ${relativeDayLabel(date).toLowerCase()}`,
      message: () => buildDayMessage(date, meals, choices, extras),
      html: () => buildDayHtml(date, meals, choices, extras),
      fileName: dayPdfName(date),
    });

  const allChosen = progress.total > 0 && progress.chosen === progress.total;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      testID="day-scroll"
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
          accessibilityLabel="Indietro"
          testID="day-back"
        >
          <Icon name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Overline style={styles.topDate}>{formatDayMonth(date)}</Overline>
        {progress.chosen > 0 ? (
          <Pressable
            onPress={onShare}
            hitSlop={10}
            style={styles.share}
            accessibilityLabel={`Condividi il menu di ${relativeDayLabel(date).toLowerCase()}`}
            testID="day-share"
          >
            <Icon name="share-outline" size={19} color={colors.green} />
          </Pressable>
        ) : null}
      </View>

      <View>
        <Display>{relativeDayLabel(date)}</Display>
        <Muted style={styles.subtitle}>
          {relativeDayLabel(date) === weekdayName(date)
            ? `${progress.total} scelte previste dal piano`
            : `${weekdayName(date)} · ${progress.total} scelte previste`}
        </Muted>
      </View>

      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <Body style={styles.summaryText}>
            {progress.chosen} di {progress.total} scelte fatte
          </Body>
          <Button
            label={allChosen ? 'Rigenera' : 'Compila'}
            icon="sparkles-outline"
            variant="secondary"
            size="sm"
            onPress={() => confirmAutoFill([date], allChosen)}
            testID="day-autofill"
          />
        </View>
        <ProgressBar value={progress.total ? progress.chosen / progress.total : 0} />
        {progress.chosen > 0 ? (
          <Button
            label="Azzera il giorno"
            variant="ghost"
            size="sm"
            onPress={() => clearDay(date)}
            style={styles.clear}
            testID="day-clear"
          />
        ) : null}
      </Card>

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
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topDate: { flex: 1 },
  share: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { marginTop: 4 },
  summary: { padding: spacing.lg, gap: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryText: { flex: 1, fontFamily: fonts.bodySemi },
  clear: { alignSelf: 'flex-start' },
  meals: { gap: spacing.md },
});
