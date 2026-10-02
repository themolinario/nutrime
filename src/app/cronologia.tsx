import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Body,
  Button,
  Card,
  CheckCircle,
  Display,
  EmptyState,
  Heading,
  Muted,
  Overline,
  ProgressBar,
  Title,
} from '../components/ui';
import {
  addDays,
  formatDayMonth,
  formatMonthYear,
  fromISODate,
  relativeDayLabel,
  weekdayOf,
} from '../lib/dates';
import {
  buildHistory,
  historyStats,
  isComplete,
  restDaysOf,
  type HistoryDay,
} from '../lib/history';
import { extrasOf, useDietStore } from '../lib/store/useDietStore';
import { useToday } from '../lib/useToday';
import { accentFor, colors, fonts, radius, spacing } from '../theme';
import { Icon, type IconName } from '../components/Icon';

const WEEKDAY_INITIALS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const WEEKS = 5;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices);
  const eaten = useDietStore((s) => s.eaten);
  const archive = useDietStore((s) => s.archive);
  const added = useDietStore((s) => s.added);
  const qtyOverrides = useDietStore((s) => s.qtyOverrides);
  const [open, setOpen] = useState<string | null>(null);
  const list = useRef<SectionList<HistoryDay>>(null);

  const today = useToday();
  const days = useMemo(
    () =>
      buildHistory(plan, choices, eaten, archive, today, (d) =>
        extrasOf({ added, qtyOverrides }, d),
      ),
    [plan, choices, eaten, archive, today, added, qtyOverrides],
  );
  const stats = useMemo(() => historyStats(days, today, restDaysOf(plan)), [days, today, plan]);
  const encouragement = cheer(stats.streak, stats.adherence);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const sections = useMemo(() => {
    const groups: { title: string; data: HistoryDay[] }[] = [];
    for (const day of days) {
      const title = formatMonthYear(day.date);
      if (groups[groups.length - 1]?.title !== title) groups.push({ title, data: [] });
      groups[groups.length - 1].data.push(day);
    }
    return groups;
  }, [days]);

  // Five weeks, Monday first, ending with the current week.
  const calendar = useMemo(() => {
    const start = addDays(today, -(weekdayOf(today) - 1) - 7 * (WEEKS - 1));
    return Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
  }, [today]);

  const jumpTo = (date: string) => {
    if (!byDate.has(date)) return;
    setOpen(date);
    const sectionIndex = sections.findIndex((s) => s.data.some((d) => d.date === date));
    const itemIndex = sections[sectionIndex].data.findIndex((d) => d.date === date);
    list.current?.scrollToLocation({ sectionIndex, itemIndex, viewOffset: 60 });
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={styles.back}
        accessibilityLabel="Indietro"
        testID="history-back"
      >
        <Icon name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <Overline>Il tuo diario</Overline>
      <Display style={styles.title}>Cronologia</Display>

      {days.length ? (
        <>
          <View style={styles.stats}>
            <Stat
              icon="flame"
              tint={colors.terracotta}
              value={`${stats.streak}`}
              label={stats.streak === 1 ? 'giorno di fila' : 'giorni di fila'}
            />
            <Stat
              icon="checkmark-done"
              tint={colors.green}
              value={`${stats.completeDays}/${stats.trackedDays}`}
              label="giornate complete"
            />
            <Stat
              icon="pie-chart"
              tint={colors.amber}
              value={`${Math.round(stats.adherence * 100)}%`}
              label="alimenti spuntati"
            />
          </View>
          <View style={styles.statsNoteRow}>
            <Icon name={encouragement.icon} size={16} color={colors.terracotta} />
            <Body style={styles.cheer}>{encouragement.text}</Body>
            <Muted style={styles.statsNote}>ultimi 30 giorni</Muted>
          </View>

          <Card style={styles.calendar} testID="history-calendar">
            <View style={styles.calendarRow}>
              {WEEKDAY_INITIALS.map((label, i) => (
                <Overline key={i} style={styles.calendarHead}>
                  {label}
                </Overline>
              ))}
            </View>
            {Array.from({ length: WEEKS }, (_, week) => (
              <View key={week} style={styles.calendarRow}>
                {calendar.slice(week * 7, week * 7 + 7).map((date) => {
                  const day = byDate.get(date);
                  const ratio = day ? day.done / day.total : 0;
                  const future = date > today;
                  return (
                    <Pressable
                      key={date}
                      onPress={() => jumpTo(date)}
                      disabled={!day}
                      style={[
                        styles.cell,
                        !day && !future && styles.cellEmpty,
                        day &&
                          (ratio > 0 || date !== today) && {
                            backgroundColor: cellColor(ratio),
                          },
                        day && ratio === 0 && date === today && styles.cellEmpty,
                        date === today && styles.cellToday,
                      ]}
                      accessibilityLabel={
                        day
                          ? `${formatDayMonth(date)}: ${day.done} di ${day.total}`
                          : formatDayMonth(date)
                      }
                    >
                      {isComplete(day) ? (
                        <Icon name="checkmark" size={13} color={colors.white} />
                      ) : (
                        <Body
                          style={[
                            styles.cellText,
                            future && styles.cellTextFuture,
                            ratio >= 0.5 && styles.cellTextOnColor,
                          ]}
                        >
                          {fromISODate(date).getDate()}
                        </Body>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View style={styles.legend}>
              <Muted style={styles.legendText}>meno</Muted>
              {[0.2, 0.5, 0.8, 1].map((r) => (
                <View key={r} style={[styles.legendCell, { backgroundColor: cellColor(r) }]} />
              ))}
              <Muted style={styles.legendText}>tutto spuntato</Muted>
            </View>
          </Card>
        </>
      ) : null}
    </View>
  );

  return (
    <SectionList
      ref={list}
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      sections={sections}
      keyExtractor={(day) => day.date}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="time-outline"
          title="Il diario è ancora vuoto"
          message="Spunta gli alimenti in Oggi e qui ritroverai ogni giornata, una dopo l’altra."
        />
      }
      renderSectionHeader={({ section }) => (
        <Overline style={styles.month}>{section.title}</Overline>
      )}
      stickySectionHeadersEnabled={false}
      renderItem={({ item }) => (
        <DayRow
          day={item}
          today={today}
          open={open === item.date}
          editable={!!plan && !!choices[item.date]}
          onToggle={() => setOpen(open === item.date ? null : item.date)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      onScrollToIndexFailed={() => {}}
      showsVerticalScrollIndicator={false}
      testID="history-list"
    />
  );
}

/** A line of encouragement that follows how things are going. */
function cheer(streak: number, adherence: number): { icon: IconName; text: string } {
  if (streak >= 7) return { icon: 'flame', text: `${streak} giorni di fila: sei una macchina!` };
  if (streak >= 3) return { icon: 'flame', text: 'Stai andando alla grande, continua così!' };
  if (streak >= 1) return { icon: 'sparkles', text: 'Bella serie: domani la allunghiamo?' };
  if (adherence >= 0.7) return { icon: 'leaf', text: 'Sei sulla buona strada.' };
  return { icon: 'sparkles', text: 'Ogni spunta conta: si ricomincia da oggi.' };
}

/** Green that deepens with how much of the day was ticked. */
function cellColor(ratio: number): string {
  if (ratio >= 1) return colors.green;
  if (ratio >= 0.75) return '#4F8C6C';
  if (ratio >= 0.5) return '#7FAE93';
  if (ratio > 0) return colors.greenBorder;
  return colors.terracottaSoft;
}

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <Card style={styles.stat}>
      <Icon name={icon} size={16} color={tint} />
      <Title style={styles.statValue}>{value}</Title>
      <Muted style={styles.statLabel}>{label}</Muted>
    </Card>
  );
}

function DayRow({
  day,
  today,
  open,
  editable,
  onToggle,
}: {
  day: HistoryDay;
  today: string;
  open: boolean;
  editable: boolean;
  onToggle: () => void;
}) {
  const complete = isComplete(day);
  return (
    <Card style={[styles.day, complete && styles.dayComplete]}>
      <Pressable
        onPress={onToggle}
        style={styles.dayHeader}
        accessibilityState={{ expanded: open }}
        testID={`history-day-${day.date}`}
      >
        <View style={styles.dayTitle}>
          <Heading>{relativeDayLabel(day.date, today)}</Heading>
          <Muted>{formatDayMonth(day.date)}</Muted>
        </View>
        <View style={styles.dayScore}>
          {complete ? <Icon name="checkmark-circle" size={17} color={colors.green} /> : null}
          <Body style={[styles.dayCount, complete && { color: colors.green }]}>
            {day.done}/{day.total}
          </Body>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textFaint} />
        </View>
      </Pressable>
      <ProgressBar value={day.done / day.total} height={4} />

      {open ? (
        <View style={styles.meals}>
          {day.meals
            .filter((meal) => meal.items.length || meal.free)
            .map((meal) => {
              const accent = accentFor(meal.key);
              return (
                <View key={meal.key} style={styles.meal}>
                  <Overline style={{ color: accent.tint }}>{meal.name}</Overline>
                  {meal.free ? <Muted style={styles.free}>Pasto libero</Muted> : null}
                  {meal.items.map((item) => (
                    <View key={item.category} style={styles.item}>
                      <CheckCircle checked={item.done} size={18} tint={accent.tint} />
                      <Body
                        style={[styles.itemName, !item.done && styles.itemMissed]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Body>
                      <Muted style={styles.itemQty}>{item.qty}</Muted>
                    </View>
                  ))}
                </View>
              );
            })}
          {editable ? (
            <Button
              label="Apri la giornata"
              icon="create-outline"
              variant="secondary"
              size="sm"
              onPress={() =>
                day.date === today
                  ? router.navigate('/oggi')
                  : router.push({
                      pathname: '/giorno/[date]',
                      params: { date: day.date },
                    })
              }
              testID={`history-open-${day.date}`}
            />
          ) : (
            <Muted style={styles.archived}>
              Viene da un piano precedente: qui puoi solo guardarla.
            </Muted>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  back: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { marginTop: 2, marginBottom: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md, gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 24, marginTop: 4 },
  statLabel: { fontSize: 11.5, lineHeight: 14 },
  statsNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  cheer: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
    color: colors.greenDeep,
  },
  statsNote: { fontSize: 11.5 },
  calendar: { padding: spacing.md, gap: 6 },
  calendarRow: { flexDirection: 'row', gap: 6 },
  calendarHead: { flex: 1, textAlign: 'center', fontSize: 10 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { backgroundColor: colors.bgSunken },
  cellToday: { borderWidth: 2, borderColor: colors.greenDeep },
  cellText: {
    fontSize: 11.5,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
  cellTextFuture: { color: colors.border },
  cellTextOnColor: { color: colors.white },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.xs,
  },
  legendCell: { width: 11, height: 11, borderRadius: 3 },
  legendText: { fontSize: 10.5, marginHorizontal: 2 },
  month: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  day: { padding: spacing.lg, gap: spacing.md },
  dayComplete: { borderColor: colors.greenBorder },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayTitle: { flex: 1 },
  dayScore: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayCount: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.textMuted,
  },
  meals: { gap: spacing.md, marginTop: spacing.xs },
  meal: { gap: 6 },
  free: { fontStyle: 'italic' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { flex: 1, fontSize: 14 },
  itemMissed: { color: colors.textFaint },
  itemQty: { fontSize: 12.5 },
  archived: { fontSize: 12, fontStyle: 'italic' },
});
