import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../components/Icon';
import { Body, Button, Card, Display, Heading, Muted, Overline, Title } from '../components/ui';
import { WeightChart } from '../components/WeightChart';
import { track } from '../lib/analytics';
import { addDays, formatDayMonth, relativeDayLabel } from '../lib/dates';
import { useDietStore } from '../lib/store/useDietStore';
import { useToday } from '../lib/useToday';
import {
  entriesInRange,
  formatDelta,
  formatKg,
  parseKg,
  WEIGHT_RANGES,
  weightEntries,
  weightOn,
} from '../lib/weight';
import { colors, fonts, radius, spacing } from '../theme';

function Stat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statValueRow}>
        {icon ? <Icon name={icon} size={15} color={colors.textMuted} /> : null}
        <Title style={styles.statValue}>{value}</Title>
      </View>
      <Muted style={styles.statLabel}>{label}</Muted>
    </Card>
  );
}

function trendIcon(delta: number): IconName {
  return delta > 0.05 ? 'trend-up' : delta < -0.05 ? 'trend-down' : 'remove';
}

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const weights = useDietStore((s) => s.weights);
  const setWeight = useDietStore((s) => s.setWeight);

  const entries = useMemo(() => weightEntries(weights), [weights]);
  const [rangeKey, setRangeKey] = useState('1m');
  const range = WEIGHT_RANGES.find((r) => r.key === rangeKey) ?? WEIGHT_RANGES[0];
  const shown = useMemo(() => entriesInRange(entries, range, today), [entries, range, today]);

  // The day being edited: today unless a past reading was picked from the list.
  // The field starts from that day's reading, or the last one before it.
  const [date, setDate] = useState(today);
  const saved = weights[date];
  const suggestion = saved ?? weightOn(entries, date)?.kg;
  const [text, setText] = useState(suggestion !== undefined ? formatKg(suggestion) : '');
  const goTo = (day: string) => {
    const kg = weights[day] ?? weightOn(entries, day)?.kg;
    setDate(day);
    setText(kg !== undefined ? formatKg(kg) : '');
  };

  const typed = parseKg(text);
  const nudge = (step: number) => {
    const base = typed ?? suggestion ?? 70;
    setText(formatKg(Math.round((base + step) * 10) / 10));
  };
  const save = () => {
    if (typed === null) {
      Alert.alert('Peso non valido', 'Scrivi il peso in chili, per esempio 72,4.');
      return;
    }
    setWeight(date, typed);
    track('weight_logged', { today: date === today });
  };

  const latest = entries[entries.length - 1];
  const previous = latest ? weightOn(entries, addDays(latest.date, -1)) : undefined;
  const periodDelta = shown.length > 1 ? shown[shown.length - 1].kg - shown[0].kg : null;
  const totalDelta = entries.length > 1 && latest ? latest.kg - entries[0].kg : null;

  const remove = (day: string) =>
    Alert.alert('Eliminare la pesata?', `Il peso del ${formatDayMonth(day)} verrà rimosso.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => setWeight(day, null) },
    ]);

  const dayLabel = date === today ? 'oggi' : relativeDayLabel(date, today).toLowerCase();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="weight-scroll"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
          accessibilityLabel="Indietro"
          testID="weight-back"
        >
          <Icon name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View>
          <Overline>Il tuo andamento</Overline>
          <Display style={styles.title}>Peso</Display>
        </View>

        <Card style={styles.entry}>
          <View style={styles.entryHeader}>
            <Pressable
              onPress={() => goTo(addDays(date, -1))}
              hitSlop={10}
              style={styles.dayArrow}
              accessibilityLabel="Giorno precedente"
              testID="weight-prev-day"
            >
              <Icon name="chevron-back" size={16} color={colors.green} />
            </Pressable>
            <View style={styles.entryTitle}>
              <Heading>Peso di {dayLabel}</Heading>
              <Muted>
                {saved !== undefined
                  ? `Registrato: ${formatKg(saved)} kg`
                  : date === today
                    ? 'Pesati al mattino, prima di colazione'
                    : formatDayMonth(date)}
              </Muted>
            </View>
            <Pressable
              onPress={() => goTo(addDays(date, 1))}
              disabled={date >= today}
              hitSlop={10}
              style={[styles.dayArrow, date >= today && styles.dayArrowOff]}
              accessibilityLabel="Giorno successivo"
              testID="weight-next-day"
            >
              <Icon name="chevron-forward" size={16} color={colors.green} />
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <Pressable
              onPress={() => nudge(-0.1)}
              style={styles.step}
              accessibilityLabel="Meno 100 grammi"
              testID="weight-minus"
            >
              <Icon name="remove" size={20} color={colors.green} />
            </Pressable>
            <View style={styles.inputBox}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="72,4"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={save}
                maxLength={5}
                style={styles.input}
                accessibilityLabel="Peso in chili"
                testID="weight-input"
              />
              <Body style={styles.unit}>kg</Body>
            </View>
            <Pressable
              onPress={() => nudge(0.1)}
              style={styles.step}
              accessibilityLabel="Più 100 grammi"
              testID="weight-plus"
            >
              <Icon name="add" size={20} color={colors.green} />
            </Pressable>
          </View>

          <Button
            label={saved !== undefined ? 'Aggiorna' : 'Salva'}
            icon="checkmark"
            onPress={save}
            disabled={typed === null || typed === saved}
            testID="weight-save"
          />
        </Card>

        {latest ? (
          <View style={styles.stats}>
            <Stat
              label={previous ? `ultimo · ${formatDelta(latest.kg - previous.kg)} kg` : 'ultimo'}
              value={`${formatKg(latest.kg)} kg`}
            />
            <Stat
              label={`in ${range.days === null ? 'totale' : range.label}`}
              value={periodDelta === null ? '—' : `${formatDelta(periodDelta)} kg`}
              icon={periodDelta === null ? undefined : trendIcon(periodDelta)}
            />
            <Stat
              label="dall’inizio"
              value={totalDelta === null ? '—' : `${formatDelta(totalDelta)} kg`}
              icon={totalDelta === null ? undefined : trendIcon(totalDelta)}
            />
          </View>
        ) : null}

        <View style={styles.ranges}>
          {WEIGHT_RANGES.map((r) => {
            const on = r.key === range.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRangeKey(r.key)}
                style={[styles.range, on && styles.rangeOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                testID={`weight-range-${r.key}`}
              >
                <Body style={[styles.rangeText, on && styles.rangeTextOn]}>{r.label}</Body>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.chartCard}>
          {shown.length >= 2 ? (
            <WeightChart entries={shown} />
          ) : (
            <View style={styles.chartEmpty}>
              <Icon name="chart-line" size={30} color={colors.green} />
              <Body style={styles.chartEmptyTitle}>
                {entries.length === 0 ? 'Nessuna pesata ancora' : 'Ancora pochi dati'}
              </Body>
              <Muted style={styles.chartEmptyText}>
                Registra il peso per qualche giorno: qui vedrai come cambia.
              </Muted>
            </View>
          )}
        </Card>

        {entries.length ? (
          <View style={styles.log}>
            <Overline style={styles.logTitle}>Registro</Overline>
            <Card style={styles.logCard}>
              {[...entries].reverse().map((entry, i, list) => {
                const before = list[i + 1];
                return (
                  <Pressable
                    key={entry.date}
                    onPress={() => goTo(entry.date)}
                    onLongPress={() => remove(entry.date)}
                    style={({ pressed }) => [
                      styles.logRow,
                      i > 0 && styles.logRowBorder,
                      pressed && styles.pressed,
                    ]}
                    accessibilityLabel={`${formatDayMonth(entry.date)}: ${formatKg(entry.kg)} chili`}
                    accessibilityHint="Tocca per modificarlo, tieni premuto per eliminarlo"
                    testID={`weight-row-${entry.date}`}
                  >
                    <Body style={styles.logDate}>{relativeDayLabel(entry.date, today)}</Body>
                    <Muted style={styles.logDay}>{formatDayMonth(entry.date)}</Muted>
                    <Muted style={styles.logDelta}>
                      {before ? formatDelta(entry.kg - before.kg) : ''}
                    </Muted>
                    <Body style={styles.logKg}>{formatKg(entry.kg)} kg</Body>
                    <Pressable
                      onPress={() => remove(entry.date)}
                      hitSlop={8}
                      accessibilityLabel={`Elimina il peso del ${formatDayMonth(entry.date)}`}
                      testID={`weight-delete-${entry.date}`}
                    >
                      <Icon name="trash-outline" size={16} color={colors.textFaint} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
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
  title: { marginTop: 2 },
  entry: { padding: spacing.lg, gap: spacing.lg },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  entryTitle: { flex: 1, alignItems: 'center' },
  dayArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayArrowOff: { opacity: 0.35 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.text,
    minWidth: 90,
    textAlign: 'center',
    padding: 0,
  },
  unit: { fontFamily: fonts.bodySemi, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 17 },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  ranges: { flexDirection: 'row', gap: spacing.sm },
  range: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rangeOn: { backgroundColor: colors.green, borderColor: colors.green },
  rangeText: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textMuted },
  rangeTextOn: { color: colors.white, fontFamily: fonts.bodySemi },
  chartCard: { paddingTop: spacing.lg, paddingBottom: spacing.sm, paddingHorizontal: spacing.sm },
  chartEmpty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  chartEmptyTitle: { fontFamily: fonts.bodySemi },
  chartEmptyText: { textAlign: 'center', paddingHorizontal: spacing.lg },
  log: { gap: spacing.sm },
  logTitle: { marginLeft: spacing.xs },
  logCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { opacity: 0.7 },
  logDate: { fontFamily: fonts.bodySemi, width: 86 },
  logDay: { flex: 1 },
  logDelta: { width: 44, textAlign: 'right', fontSize: 13 },
  logKg: { fontFamily: fonts.bodySemi, width: 74, textAlign: 'right' },
});
