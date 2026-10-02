import { DatePicker, Host } from '@expo/ui/swift-ui';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Heading, Muted, Title } from '../components/ui';
import { parseTime } from '../lib/reminders/plan';
import { requestReminderPermission } from '../lib/reminders/useReminders';
import { useDietStore } from '../lib/store/useDietStore';
import { accentFor, colors, spacing } from '../theme';
import { Icon } from '../components/Icon';
import { showDialog } from '../lib/dialog';

/** A sensible first time per meal; the user then adjusts it. */
const DEFAULT_TIMES: Record<string, string> = {
  colazione: '07:30',
  'meta-mattina': '10:30',
  spuntino: '10:30',
  pranzo: '13:00',
  merenda: '16:30',
  'meta-pomeriggio': '16:30',
  cena: '20:00',
  'dopo-cena': '21:30',
  'spuntino-serale': '21:30',
};

function toDate(time: string): Date {
  const parsed = parseTime(time) ?? { hour: 12, minute: 0 };
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date;
}

function toTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const meals = useDietStore((s) => s.plan?.meals ?? []);
  const reminders = useDietStore((s) => s.reminders);
  const setReminder = useDietStore((s) => s.setReminder);
  const recapTime = useDietStore((s) => s.recapTime);
  const setRecapTime = useDietStore((s) => s.setRecapTime);

  const permitted = async () => {
    if (await requestReminderPermission()) return true;
    showDialog(
      'Notifiche disattivate',
      'Per ricevere i promemoria, attiva le notifiche di NutriMy nelle Impostazioni.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Apri Impostazioni',
          onPress: () => void Linking.openSettings(),
        },
      ],
    );
    return false;
  };

  const onToggle = async (mealKey: string, on: boolean) => {
    if (!on) setReminder(mealKey, null);
    else if (await permitted()) setReminder(mealKey, DEFAULT_TIMES[mealKey] ?? '12:00');
  };

  const onToggleRecap = async (on: boolean) => {
    if (!on) setRecapTime(null);
    else if (await permitted()) setRecapTime('21:30');
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Title style={styles.headerTitle}>Promemoria dei pasti</Title>
            <Muted>
              All’ora giusta ti arriva un messaggio con il menu del pasto. Tienilo premuto e tocca
              «Segna come fatto»: il pasto si spunta da solo.
            </Muted>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Chiudi"
            testID="reminders-close"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          {meals.map((meal, index) => {
            const accent = accentFor(meal.key);
            const time = reminders[meal.key];
            return (
              <View key={meal.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row} testID={`reminder-${meal.key}`}>
                  <View style={[styles.icon, { backgroundColor: accent.soft }]}>
                    <Icon name={accent.icon} size={17} color={accent.tint} />
                  </View>
                  <View style={styles.rowText}>
                    <Heading>{meal.name}</Heading>
                    <Muted>{time ? 'Ogni giorno' : 'Nessun promemoria'}</Muted>
                  </View>
                  {time ? (
                    <Host matchContents>
                      <DatePicker
                        selection={toDate(time)}
                        displayedComponents={['hourAndMinute']}
                        onDateChange={(date) => setReminder(meal.key, toTime(date))}
                      />
                    </Host>
                  ) : null}
                  <Switch
                    value={!!time}
                    onValueChange={(on) => void onToggle(meal.key, on)}
                    trackColor={{
                      true: colors.green,
                      false: colors.borderStrong,
                    }}
                    accessibilityLabel={`Promemoria ${meal.name}`}
                    testID={`reminder-switch-${meal.key}`}
                  />
                </View>
              </View>
            );
          })}
        </Card>
        <Card style={styles.card}>
          <View style={styles.row} testID="reminder-recap">
            <View style={[styles.icon, { backgroundColor: colors.plumSoft }]}>
              <Icon name="sparkles-outline" size={17} color={colors.plum} />
            </View>
            <View style={styles.rowText}>
              <Heading>Riepilogo della sera</Heading>
              <Muted>
                {recapTime ? 'Se manca qualche spunta' : 'Un promemoria per chiudere la giornata'}
              </Muted>
            </View>
            {recapTime ? (
              <Host matchContents>
                <DatePicker
                  selection={toDate(recapTime)}
                  displayedComponents={['hourAndMinute']}
                  onDateChange={(date) => setRecapTime(toTime(date))}
                />
              </Host>
            ) : null}
            <Switch
              value={!!recapTime}
              onValueChange={(on) => void onToggleRecap(on)}
              trackColor={{ true: colors.green, false: colors.borderStrong }}
              accessibilityLabel="Riepilogo della sera"
              testID="reminder-switch-recap"
            />
          </View>
        </Card>
        <Muted style={styles.note}>
          Se hai già spuntato il pasto, niente notifica. E se non hai ancora scelto il menu, te lo
          ricordiamo noi.
        </Muted>
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 22 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { paddingHorizontal: spacing.lg },
  divider: { height: 1, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  note: { paddingHorizontal: spacing.xs, fontSize: 13 },
});
