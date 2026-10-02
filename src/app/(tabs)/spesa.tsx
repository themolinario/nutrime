import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
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
} from '../../components/ui';
import { TipAnchor } from '../../components/Tip';
import { formatDayMonth, relativeDayLabel } from '../../lib/dates';
import { buildShoppingList, groupByAisle, type ShoppingLine } from '../../lib/diet/shopping';
import { showExportMenu } from '../../lib/export/share';
import {
  buildShoppingHtml,
  buildShoppingMessage,
  shoppingPdfName,
} from '../../lib/export/shopping';
import { extrasOf, HORIZONS, planningWindow, useDietStore } from '../../lib/store/useDietStore';
import { useToday } from '../../lib/useToday';
import { colors, fonts, radius, spacing } from '../../theme';
import { Icon } from '../../components/Icon';

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const plan = useDietStore((s) => s.plan);
  const choices = useDietStore((s) => s.choices);
  const bought = useDietStore((s) => s.bought);
  const extras = useDietStore((s) => s.extras);
  const horizon = useDietStore((s) => s.horizon);
  const toggleBought = useDietStore((s) => s.toggleBought);
  const resetBought = useDietStore((s) => s.resetBought);
  const addExtra = useDietStore((s) => s.addExtra);
  const removeExtra = useDietStore((s) => s.removeExtra);
  const setHorizon = useDietStore((s) => s.setHorizon);
  const hideBought = useDietStore((s) => s.hideBought);
  const setHideBought = useDietStore((s) => s.setHideBought);

  const [draft, setDraft] = useState('');
  const [draftQty, setDraftQty] = useState('');

  const today = useToday();
  const dates = useMemo(() => planningWindow(horizon, today), [horizon, today]);

  const added = useDietStore((s) => s.added);
  const qtyOverrides = useDietStore((s) => s.qtyOverrides);
  const lines = useMemo(
    () => buildShoppingList(plan, dates, choices, (d) => extrasOf({ added, qtyOverrides }, d)),
    [plan, dates, choices, added, qtyOverrides],
  );

  const extraLines = useMemo<ShoppingLine[]>(
    () =>
      extras.map((e) => ({
        id: e.id,
        name: e.name,
        qtyLabel: e.qty,
        aisle: 'Altro' as const,
        times: 1,
        dates: [],
        manual: true,
      })),
    [extras],
  );

  // Hand-added lines are not part of the plan, so they get their own section at
  // the top rather than being buried among the aisles.
  const groups = useMemo(
    () => [
      ...(extraLines.length ? [{ aisle: 'Aggiunti da te', lines: extraLines }] : []),
      ...groupByAisle(lines),
    ],
    [lines, extraLines],
  );
  const all = lines.length + extraLines.length;
  const done = [...lines, ...extraLines].filter((l) => bought[l.id]).length;

  // What is on screen is also what gets shared, so hidden lines stay out of the export.
  const visibleGroups = useMemo(
    () =>
      hideBought
        ? groups
            .map((g) => ({ ...g, lines: g.lines.filter((l) => !bought[l.id]) }))
            .filter((g) => g.lines.length > 0)
        : groups,
    [groups, bought, hideBought],
  );

  const onShare = () =>
    showExportMenu({
      kind: 'shopping',
      title: 'Condividi la lista della spesa',
      message: () => buildShoppingMessage(dates, visibleGroups, bought),
      html: () => buildShoppingHtml(dates, visibleGroups, bought),
      fileName: shoppingPdfName(dates),
    });

  const onAdd = () => {
    if (!draft.trim()) return;
    addExtra(draft, draftQty || 'q.b.');
    setDraft('');
    setDraftQty('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        testID="shopping-scroll"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Overline>{`${formatDayMonth(dates[0])} – ${formatDayMonth(dates[dates.length - 1])}`}</Overline>
            <Display style={styles.title}>Spesa</Display>
          </View>
          {all > 0 ? (
            <TipAnchor
              id="spesa-share"
              order={3}
              text="Invia la lista su WhatsApp o stampala in PDF."
            >
              <Pressable
                onPress={onShare}
                hitSlop={10}
                style={styles.iconButton}
                accessibilityLabel="Condividi la lista"
                testID="shopping-share"
              >
                <Icon name="share-outline" size={19} color={colors.green} />
              </Pressable>
            </TipAnchor>
          ) : null}
        </View>

        <TipAnchor
          id="spesa-horizon"
          order={1}
          style={styles.tipFit}
          text="Scegli per quanti giorni fare la spesa: le quantità si sommano da sole."
        >
          <View style={styles.horizons}>
            {HORIZONS.map((days) => {
              const active = days === horizon;
              return (
                <Pressable
                  key={days}
                  onPress={() => setHorizon(days)}
                  style={[styles.horizon, active && styles.horizonActive]}
                  testID={`horizon-${days}`}
                >
                  <Body style={[styles.horizonText, active && styles.horizonTextActive]}>
                    {days} giorni
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </TipAnchor>
        {all === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="La lista è ancora vuota"
            message="Scegli cosa mangiare nella scheda Settimana: la lista si scrive da sola, quantità comprese."
          />
        ) : (
          <>
            <Card style={styles.summary}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryText}>
                  <Title
                    style={styles.summaryTitle}
                    accessible
                    accessibilityLabel={`${done} di ${all} nel carrello`}
                    testID="shopping-progress"
                  >
                    {done} di {all} nel carrello
                  </Title>
                  <Muted>{groups.length} reparti</Muted>
                </View>
                {done > 0 ? (
                  <Button
                    label="Azzera"
                    variant="ghost"
                    size="sm"
                    onPress={resetBought}
                    testID="shopping-reset"
                  />
                ) : null}
              </View>
              <ProgressBar value={all ? done / all : 0} />
              <View style={styles.hideRow}>
                <Body style={styles.hideLabel}>Nascondi quelli già nel carrello</Body>
                <TipAnchor
                  id="spesa-hide"
                  order={2}
                  text="Nasconde quello che hai già nel carrello. Anche la lista che condividi esce senza."
                >
                  <Switch
                    value={hideBought}
                    onValueChange={setHideBought}
                    trackColor={{ true: colors.green, false: colors.borderStrong }}
                    accessibilityLabel="Nascondi quelli già nel carrello"
                    testID="shopping-hide-bought"
                  />
                </TipAnchor>
              </View>
            </Card>

            {hideBought && visibleGroups.length === 0 ? (
              <Muted style={styles.allDone}>Hai preso tutto!</Muted>
            ) : null}

            {visibleGroups.map((group) => (
              <View key={group.aisle} style={styles.group}>
                <Overline style={styles.groupTitle}>{group.aisle}</Overline>
                <Card style={styles.groupCard}>
                  {group.lines.map((line, index) => {
                    const checked = !!bought[line.id];
                    return (
                      <View key={line.id}>
                        {index > 0 ? <View style={styles.rowDivider} /> : null}
                        <Pressable
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            toggleBought(line.id);
                          }}
                          style={({ pressed }) => [styles.line, pressed && styles.linePressed]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          testID={`shop-${line.id}`}
                        >
                          <CheckCircle checked={checked} size={23} />
                          <View style={styles.lineText}>
                            <Heading style={[styles.lineName, checked && styles.lineDone]}>
                              {line.name}
                            </Heading>
                            {line.dates.length > 1 ? (
                              <Muted style={styles.lineMeta}>
                                {line.times} volte ·{' '}
                                {line.dates.map((d) => relativeDayLabel(d, today)).join(', ')}
                              </Muted>
                            ) : null}
                          </View>
                          <Body style={[styles.lineQty, checked && styles.lineDone]}>
                            {line.qtyLabel}
                          </Body>
                          {line.manual ? (
                            <Pressable
                              onPress={() => removeExtra(line.id)}
                              hitSlop={8}
                              accessibilityLabel={`Rimuovi ${line.name}`}
                            >
                              <Icon name="close" size={16} color={colors.textFaint} />
                            </Pressable>
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.addBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Aggiungi alla lista…"
          placeholderTextColor={colors.textFaint}
          style={styles.addInput}
          returnKeyType="next"
          accessibilityLabel="Nome dell'articolo da aggiungere"
          testID="shopping-add-name"
        />
        <TextInput
          value={draftQty}
          onChangeText={setDraftQty}
          placeholder="Q.tà"
          placeholderTextColor={colors.textFaint}
          style={[styles.addInput, styles.addQty]}
          returnKeyType="done"
          onSubmitEditing={onAdd}
          accessibilityLabel="Quantità"
          testID="shopping-add-qty"
        />
        <Pressable
          onPress={onAdd}
          style={[styles.addButton, !draft.trim() && styles.addButtonOff]}
          disabled={!draft.trim()}
          accessibilityLabel="Aggiungi alla lista"
          testID="shopping-add"
        >
          <Icon name="add" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  headerText: { flex: 1 },
  title: { marginTop: 2 },
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
  summary: { padding: spacing.lg, gap: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryText: { flex: 1 },
  summaryTitle: { fontFamily: fonts.bodySemi, fontSize: 16, marginBottom: 2 },
  tipFit: { alignSelf: 'flex-start' },
  hideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hideLabel: { flex: 1, fontSize: 14, color: colors.textMuted },
  allDone: { textAlign: 'center', marginTop: spacing.md },
  group: { gap: spacing.sm },
  groupTitle: { marginLeft: spacing.xs },
  groupCard: { paddingHorizontal: spacing.lg },
  rowDivider: { height: 1, backgroundColor: colors.border },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  linePressed: { opacity: 0.6 },
  lineText: { flex: 1 },
  lineName: { fontSize: 15 },
  lineMeta: { fontSize: 11.5, marginTop: 1 },
  lineQty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  lineDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    height: 42,
    padding: 0,
  },
  addQty: { flex: 0, width: 62 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonOff: { backgroundColor: colors.borderStrong },
});
