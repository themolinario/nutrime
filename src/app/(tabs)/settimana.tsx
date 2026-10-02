import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Body,
  Button,
  Card,
  Display,
  Heading,
  Muted,
  Overline,
  ProgressBar,
  Title,
} from '../../components/ui';
import { TipAnchor } from '../../components/Tip';
import { formatDayMonth, relativeDayLabel } from '../../lib/dates';
import { confirmAutoFill } from '../../lib/diet/confirmAutoFill';
import { hasChoices, mealsForDate } from '../../lib/diet/parse';
import { slotKey } from '../../lib/diet/slots';
import type { DietPlan } from '../../lib/diet/types';
import { buildRangeHtml, buildRangeMessage, rangePdfName } from '../../lib/export/menu';
import { showExportMenu } from '../../lib/export/share';
import {
  dayProgress,
  extrasOf,
  HORIZONS,
  planningWindow,
  useDietStore,
} from '../../lib/store/useDietStore';
import { useToday } from '../../lib/useToday';
import { accentFor, colors, fonts, radius, spacing } from '../../theme';
import { Icon } from '../../components/Icon';

/** One line per meal: what was chosen, or how many picks are missing. */
function daySummary(plan: DietPlan, date: string, choices: Record<string, string> | undefined) {
  return mealsForDate(plan, date).map((meal) => {
    const picks = meal.categories
      .map((category) => {
        const id = choices?.[slotKey(meal.key, category.id)];
        return category.options.find((o) => o.id === id)?.name;
      })
      .filter((name): name is string => !!name);

    return {
      key: meal.key,
      name: meal.name,
      free: meal.free,
      total: meal.categories.length,
      picks,
    };
  });
}

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices);
  const eaten = useDietStore((s) => s.eaten);
  const horizon = useDietStore((s) => s.horizon);
  const setHorizon = useDietStore((s) => s.setHorizon);

  const today = useToday();
  const dates = useMemo(() => planningWindow(horizon, today), [horizon, today]);

  const days = useMemo(() => {
    if (!plan) return [];
    return dates.map((date) => {
      const meals = mealsForDate(plan, date);
      return {
        date,
        choosable: hasChoices(meals),
        meals: daySummary(plan, date, choices[date]),
        progress: dayProgress(meals, choices[date], eaten[date]),
      };
    });
  }, [plan, dates, choices, eaten]);

  const missing = days.reduce((n, d) => n + (d.progress.total - d.progress.chosen), 0);
  const canChoose = days.some((d) => d.choosable);

  const onShare = () => {
    if (!plan) return;
    const state = useDietStore.getState();
    const extrasFor = (d: string) => extrasOf(state, d);
    showExportMenu({
      kind: 'range',
      title: `Condividi il menu di ${horizon} giorni`,
      message: () => buildRangeMessage(plan, dates, choices, extrasFor),
      html: () => buildRangeHtml(plan, dates, choices, extrasFor),
      fileName: rangePdfName(dates),
    });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      testID="week-scroll"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Overline>I prossimi {horizon} giorni</Overline>
          <Display style={styles.title}>{horizon > 7 ? 'Due settimane' : 'Settimana'}</Display>
        </View>
        <TipAnchor
          id="settimana-history"
          order={1}
          text="Cronologia: i giorni passati con quello che hai spuntato e la tua serie di giornate complete."
        >
          <Pressable
            onPress={() => router.push('/cronologia')}
            hitSlop={10}
            style={styles.iconButton}
            accessibilityLabel="Cronologia delle giornate"
            testID="week-history"
          >
            <Icon name="history" size={19} color={colors.green} />
          </Pressable>
        </TipAnchor>
        <TipAnchor
          id="settimana-share"
          order={2}
          text="Condividi il menu dei prossimi giorni su WhatsApp o esportalo in PDF."
        >
          <Pressable
            onPress={onShare}
            hitSlop={10}
            style={styles.iconButton}
            accessibilityLabel="Condividi il menu dei prossimi giorni"
            testID="week-share"
          >
            <Icon name="share-outline" size={19} color={colors.green} />
          </Pressable>
        </TipAnchor>
      </View>

      <View style={styles.horizons}>
        {HORIZONS.map((count) => {
          const active = count === horizon;
          return (
            <Pressable
              key={count}
              onPress={() => setHorizon(count)}
              style={[styles.horizon, active && styles.horizonActive]}
              testID={`week-horizon-${count}`}
            >
              <Body style={[styles.horizonText, active && styles.horizonTextActive]}>
                {count} giorni
              </Body>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.banner}>
        <View style={styles.bannerText}>
          <Heading
            accessible
            accessibilityLabel={
              missing === 0 ? 'Tutto pianificato' : `${missing} scelte ancora da fare`
            }
            testID={missing === 0 ? 'week-complete' : 'week-missing'}
          >
            {missing === 0 ? 'Tutto pianificato' : `${missing} scelte ancora da fare`}
          </Heading>
          <Muted style={styles.bannerSub}>
            {missing === 0
              ? 'La lista della spesa ti aspetta nella scheda Spesa.'
              : 'Compila i giorni e NutriMy ti prepara la lista della spesa.'}
          </Muted>
        </View>
        {canChoose ? (
          <Button
            label={missing === 0 ? 'Rigenera' : 'Compila tutto'}
            icon="sparkles-outline"
            variant={missing === 0 ? 'secondary' : 'primary'}
            size="sm"
            onPress={() => confirmAutoFill(dates, missing === 0)}
            testID="week-autofill"
          />
        ) : null}
      </Card>

      <View style={styles.days}>
        {days.map(({ date, meals, progress }, index) => {
          const ratio = progress.total ? progress.chosen / progress.total : 0;
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              onPress={() => router.push({ pathname: '/giorno/[date]', params: { date } })}
              style={({ pressed }) => [pressed && styles.pressed]}
              testID={`week-day-${index}`}
              accessibilityLabel={`${relativeDayLabel(date, today)}, ${progress.chosen} di ${progress.total} scelte`}
            >
              <Card style={[styles.day, isToday && styles.dayToday]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderText}>
                    <Title style={styles.dayName}>{relativeDayLabel(date, today)}</Title>
                    <Muted>{formatDayMonth(date)}</Muted>
                  </View>
                  <View style={styles.dayCount}>
                    <Body style={styles.dayCountText}>
                      {progress.chosen}/{progress.total}
                    </Body>
                    <Icon name="chevron-forward" size={16} color={colors.textFaint} />
                  </View>
                </View>

                <ProgressBar value={ratio} height={4} />

                <View style={styles.mealLines}>
                  {meals.map((meal) => {
                    const accent = accentFor(meal.key);
                    return (
                      <View key={meal.key} style={styles.mealLine}>
                        <View style={[styles.dot, { backgroundColor: accent.tint }]} />
                        <Body style={styles.mealLabel} numberOfLines={1}>
                          {meal.name}
                        </Body>
                        <Body
                          style={[
                            styles.mealPicks,
                            meal.picks.length === 0 && !meal.free && styles.mealPicksEmpty,
                          ]}
                          numberOfLines={1}
                        >
                          {meal.free
                            ? 'Pasto libero'
                            : meal.picks.length
                              ? meal.picks.join(' · ')
                              : `da scegliere (${meal.total})`}
                        </Body>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  title: { marginTop: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  headerText: { flex: 1 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  horizons: { flexDirection: 'row', gap: spacing.sm },
  horizon: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  horizonActive: { backgroundColor: colors.green, borderColor: colors.green },
  horizonText: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textMuted },
  horizonTextActive: { color: colors.white, fontFamily: fonts.bodySemi },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  bannerText: { flex: 1 },
  bannerSub: { marginTop: 2 },
  days: { gap: spacing.md },
  pressed: { opacity: 0.85 },
  day: { padding: spacing.lg, gap: spacing.md },
  dayToday: { borderColor: colors.greenBorder, borderWidth: 1.5 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayHeaderText: { flex: 1 },
  dayName: { fontSize: 18 },
  dayCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dayCountText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  mealLines: { gap: 6 },
  mealLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mealLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: colors.textMuted,
    width: 104,
  },
  mealPicks: { flex: 1, fontSize: 13 },
  mealPicksEmpty: { color: colors.textFaint, fontStyle: 'italic' },
});
