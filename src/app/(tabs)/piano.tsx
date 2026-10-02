import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, Display, Heading, Muted, Overline, Title } from '../../components/ui';
import { setAnalyticsConsent } from '../../lib/analytics';
import { useSession } from '../../lib/cloud/session';
import { cycleWeek } from '../../lib/diet/parse';
import { useToday } from '../../lib/useToday';
import { WEEKDAY_LABELS } from '../../lib/diet/text';
import { useDeveloperPromoEnabled } from '../../lib/developer';
import { useDietStore } from '../../lib/store/useDietStore';
import { accentFor, colors, fonts, radius, spacing } from '../../theme';
import { Icon } from '../../components/Icon';
import { showDialog } from '../../lib/dialog';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const plan = useDietStore((s) => s.plan);
  const clearPlan = useDietStore((s) => s.clearPlan);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const reminderCount = useDietStore((s) => Object.keys(s.reminders).length);
  const resetTips = useDietStore((s) => s.resetTips);
  const setCycleWeek = useDietStore((s) => s.setCycleWeek);
  const today = useToday();
  const statsOn = useDietStore((s) => s.analyticsConsent === true);
  const session = useSession((s) => s.session);
  const developerPromo = useDeveloperPromoEnabled();

  const stats = useMemo(() => {
    if (!plan) return { meals: 0, categories: 0, foods: 0 };
    let categories = 0;
    let foods = 0;
    for (const meal of plan.meals) {
      for (const variant of meal.variants) {
        categories += variant.categories.length;
        for (const category of variant.categories) foods += category.options.length;
      }
    }
    return { meals: plan.meals.length, categories, foods };
  }, [plan]);

  if (!plan) return null;

  const onReset = () => {
    showDialog(
      'Eliminare il piano?',
      'Verranno cancellati il piano importato, le scelte e la lista della spesa. Il diario delle giornate resta.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            clearPlan();
            router.replace('/importa');
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      testID="plan-scroll"
    >
      <View>
        <Overline>Piano importato</Overline>
        <Display
          style={styles.title}
          accessibilityRole="header"
          accessible
          accessibilityLabel={plan.patient.name ?? 'Il mio piano'}
          testID="plan-title"
        >
          {plan.patient.name ?? 'Il mio piano'}
        </Display>
      </View>

      <Card style={styles.info}>
        {plan.patient.professional ? (
          <View style={styles.infoRow}>
            <Icon name="person-outline" size={16} color={colors.textMuted} />
            <Body style={styles.infoText}>{plan.patient.professional}</Body>
          </View>
        ) : null}
        {plan.patient.visitDate ? (
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={16} color={colors.textMuted} />
            <Body style={styles.infoText}>Visita del {plan.patient.visitDate}</Body>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Icon name="document-outline" size={16} color={colors.textMuted} />
          <Body style={styles.infoText} numberOfLines={1}>
            {plan.sourceName}
          </Body>
        </View>
      </Card>

      {plan.patient.details.length ? (
        <View style={styles.metrics}>
          {plan.patient.details.map((detail) => (
            <Card key={detail.label} style={styles.metric}>
              <Overline numberOfLines={1}>{detail.label.split('(')[0].trim()}</Overline>
              <Title style={styles.metricValue}>{detail.value}</Title>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <Stat value={stats.meals} label="pasti" />
        <Stat value={stats.categories} label="tabelle" />
        <Stat value={stats.foods} label="alimenti" />
      </View>

      {plan.weekCycle ? (
        <Card style={styles.cycle} testID="plan-cycle">
          <View style={styles.mealHeaderText}>
            <Heading>Menu a rotazione di {plan.weekCycle.weeks} settimane</Heading>
            <Muted>Scegli quale settimana del piano stai seguendo adesso.</Muted>
          </View>
          <View style={styles.cyclePills}>
            {Array.from({ length: plan.weekCycle.weeks }, (_, i) => i + 1).map((week) => {
              const active = cycleWeek(plan, today) === week;
              return (
                <Pressable
                  key={week}
                  onPress={() => setCycleWeek(week)}
                  style={[styles.cyclePill, active && styles.cyclePillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  testID={`plan-cycle-${week}`}
                >
                  <Body style={[styles.cyclePillText, active && styles.cyclePillTextActive]}>
                    {week}ª settimana
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <Overline style={styles.sectionTitle}>Le tabelle del piano</Overline>
        {plan.meals.map((meal) => {
          const accent = accentFor(meal.key);
          const open = openMeal === meal.key;
          return (
            <Card key={meal.key} style={styles.mealCard}>
              <Pressable
                onPress={() => setOpenMeal(open ? null : meal.key)}
                style={styles.mealHeader}
                testID={`plan-meal-${meal.key}`}
              >
                <View style={[styles.mealDot, { backgroundColor: accent.soft }]}>
                  <Icon name={accent.icon} size={16} color={accent.tint} />
                </View>
                <View style={styles.mealHeaderText}>
                  <Heading>{meal.name}</Heading>
                  <Muted>
                    {meal.variants.length}{' '}
                    {meal.variants.length === 1 ? 'gruppo di giorni' : 'gruppi di giorni'}
                  </Muted>
                </View>
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textFaint}
                />
              </Pressable>

              {open ? (
                <View style={styles.variants}>
                  {meal.variants.map((variant) => (
                    <View key={variant.id} style={styles.variant}>
                      <View style={styles.dayTags}>
                        {variant.days.map((d) => (
                          <View key={d} style={[styles.dayTag, { backgroundColor: accent.soft }]}>
                            <Overline style={{ color: accent.tint, fontSize: 10 }}>
                              {WEEKDAY_LABELS[d - 1].slice(0, 3)}
                            </Overline>
                          </View>
                        ))}
                      </View>
                      {variant.free ? (
                        <Muted style={styles.freeText}>Pasto libero</Muted>
                      ) : (
                        variant.categories.map((category) => (
                          <View key={category.id} style={styles.category}>
                            <Body style={styles.categoryName}>{category.name}</Body>
                            <Muted style={styles.categoryOptions}>
                              {category.options.map((o) => `${o.name} (${o.qty.raw})`).join(' · ')}
                            </Muted>
                          </View>
                        ))
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      {plan.warnings.length ? (
        <Card style={styles.warnings}>
          <Heading style={styles.warningsTitle}>Avvisi di lettura</Heading>
          {plan.warnings.map((warning) => (
            <Muted key={warning}>• {warning}</Muted>
          ))}
        </Card>
      ) : null}

      <Card style={styles.settings}>
        <Pressable
          onPress={() => router.push('/cronologia')}
          style={styles.settingsRow}
          testID="plan-history"
        >
          <Icon name="history" size={18} color={colors.green} />
          <View style={styles.mealHeaderText}>
            <Heading>Cronologia delle giornate</Heading>
            <Muted>I giorni passati, con tutto quello che hai spuntato</Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <View style={styles.settingsDivider} />
        <Pressable
          onPress={() => router.push('/account')}
          style={styles.settingsRow}
          testID="plan-account"
        >
          <Icon
            name={session ? 'cloud-done-outline' : 'cloud-outline'}
            size={18}
            color={colors.green}
          />
          <View style={styles.mealHeaderText}>
            <Heading>Account e backup</Heading>
            <Muted numberOfLines={1}>
              {session
                ? `Salvato online · ${session.user.email ?? 'Apple'}`
                : 'Salva i tuoi dati online'}
            </Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <View style={styles.settingsDivider} />
        <Pressable
          onPress={() => router.push('/promemoria')}
          style={styles.settingsRow}
          testID="plan-reminders"
        >
          <Icon name="notifications-outline" size={18} color={colors.green} />
          <View style={styles.mealHeaderText}>
            <Heading>Promemoria dei pasti</Heading>
            <Muted>
              {reminderCount
                ? `${reminderCount} ${reminderCount === 1 ? 'pasto' : 'pasti'} con notifica`
                : 'Nessuna notifica impostata'}
            </Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <View style={styles.settingsDivider} />
        <Pressable
          onPress={() => router.push('/benvenuto')}
          style={styles.settingsRow}
          testID="plan-onboarding"
        >
          <Icon name="help-circle-outline" size={18} color={colors.green} />
          <View style={styles.mealHeaderText}>
            <Heading>Rivedi l’introduzione</Heading>
            <Muted>Come funzionano PDF, giornata e spesa</Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <View style={styles.settingsDivider} />
        <Pressable
          onPress={() => {
            resetTips();
            router.navigate('/oggi');
          }}
          style={styles.settingsRow}
          testID="plan-tips"
        >
          <Icon name="chatbubble-ellipses-outline" size={18} color={colors.green} />
          <View style={styles.mealHeaderText}>
            <Heading>Rivedi i suggerimenti</Heading>
            <Muted>
              I fumetti che spiegano i pulsanti. Tieni premuto un pulsante per rivederne uno
            </Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <View style={styles.settingsDivider} />
        <View style={styles.settingsRow} testID="plan-stats">
          <Icon name="bar-chart-outline" size={18} color={colors.green} />
          <View style={styles.mealHeaderText}>
            <Heading>Statistiche anonime</Heading>
            <Muted>Ci dicono come usi l’app, senza dati del piano né del tuo account</Muted>
          </View>
          <Switch
            value={statsOn}
            onValueChange={setAnalyticsConsent}
            trackColor={{ true: colors.green, false: colors.borderStrong }}
            accessibilityLabel="Statistiche anonime"
            testID="plan-stats-switch"
          />
        </View>
        {developerPromo ? (
          <>
            <View style={styles.settingsDivider} />
            <Pressable
              onPress={() => router.push('/sviluppatore')}
              style={styles.settingsRow}
              testID="plan-developer"
            >
              <Icon name="rocket-outline" size={18} color={colors.terracotta} />
              <View style={styles.mealHeaderText}>
                <Heading>Contatta lo sviluppatore</Heading>
                <Muted>Modifiche, idee o un progetto su misura</Muted>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          </>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button
          label="Importa un altro PDF"
          icon="swap-horizontal-outline"
          variant="secondary"
          onPress={() => router.push('/importa')}
          testID="plan-reimport"
        />
        <Button
          label="Elimina il piano"
          icon="trash-outline"
          variant="danger"
          onPress={onReset}
          testID="plan-delete"
        />
      </View>

      <Muted style={styles.footer}>
        NutriMy non sostituisce il nutrizionista: nel dubbio, fai sempre riferimento al piano
        originale.
      </Muted>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Title style={styles.statValue}>{value}</Title>
      <Muted>{label}</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  cycle: { padding: spacing.lg, gap: spacing.md },
  cyclePills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  cyclePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cyclePillActive: { backgroundColor: colors.green, borderColor: colors.green },
  cyclePillText: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textMuted },
  cyclePillTextActive: { color: colors.white, fontFamily: fonts.bodySemi },
  settings: { paddingHorizontal: spacing.lg },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  settingsDivider: { height: 1, backgroundColor: colors.border },
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  title: { marginTop: 2 },
  info: { padding: spacing.lg, gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { flex: 1, fontSize: 14 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
    flexBasis: '28%',
    maxWidth: '48%',
  },
  metricValue: { fontSize: 17, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { fontFamily: fonts.display, fontSize: 24, color: colors.green },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs },
  mealCard: { padding: spacing.lg, gap: spacing.md },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mealDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHeaderText: { flex: 1 },
  variants: { gap: spacing.lg },
  variant: { gap: spacing.sm },
  dayTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dayTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  freeText: { fontStyle: 'italic' },
  category: { gap: 1 },
  categoryName: { fontFamily: fonts.bodySemi, fontSize: 13.5 },
  categoryOptions: { fontSize: 12, lineHeight: 17 },
  warnings: {
    padding: spacing.lg,
    gap: 4,
    backgroundColor: colors.amberSoft,
    borderColor: '#F0DCB4',
  },
  warningsTitle: { marginBottom: 2 },
  actions: { gap: spacing.sm },
  footer: { textAlign: 'center', fontSize: 11.5, paddingHorizontal: spacing.lg },
});
