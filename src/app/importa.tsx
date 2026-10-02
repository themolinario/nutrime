import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, Display, Heading, Muted, Overline, Title } from '../components/ui';
import { useImportPdf } from '../lib/diet/useImportPdf';
import { useIncomingPdf } from '../lib/pdf/useIncomingPdf';
import { useDietStore } from '../lib/store/useDietStore';
import { colors, fonts, radius, spacing } from '../theme';
import { Icon } from '../components/Icon';

const STEPS = [
  {
    icon: 'document-attach-outline' as const,
    title: 'Carica la dieta',
    text: 'Il PDF o il file Word del nutrizionista, così com’è.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'NutriMy lo legge',
    text: 'Riconosce pasti, tabelle, alternative e grammature.',
  },
  {
    icon: 'checkbox-outline' as const,
    title: 'Scegli e spunta',
    text: 'Una checklist per ogni giorno e la lista della spesa pronta.',
  },
];

export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const hasPlan = useDietStore((s) => s.plan !== null);

  const onDone = useCallback(() => router.replace('/oggi'), []);
  const { ready, stage, error, busy, importFromUri, importFromPicker } = useImportPdf(onDone);

  useIncomingPdf(importFromUri);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.greenDeep, colors.green]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Icon name="leaf" size={19} color={colors.greenDeep} />
          </View>
          <Overline style={styles.logoText}>NutriMy</Overline>
        </View>
        <Display style={styles.heroTitle}>La tua dieta,{'\n'}finalmente viva.</Display>
        <Body style={styles.heroBody}>
          Carica il PDF o il Word del nutrizionista: NutriMy lo trasforma in una checklist giorno
          per giorno e in una lista della spesa già pronta. Zero fatica.
        </Body>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 150 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.steps}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon name={step.icon} size={18} color={colors.green} />
              </View>
              <View style={styles.stepBody}>
                <Heading>
                  {index + 1}. {step.title}
                </Heading>
                <Muted style={styles.stepText}>{step.text}</Muted>
              </View>
            </View>
          ))}
        </View>

        <Card style={styles.privacy}>
          <Icon name="lock-closed-outline" size={17} color={colors.green} />
          <View style={styles.privacyBody}>
            <Heading>Letto sul telefono</Heading>
            <Muted style={styles.stepText}>
              Il file viene elaborato sul telefono. Il backup online è facoltativo: decidi tu.
            </Muted>
          </View>
        </Card>

        {error ? (
          <Card style={styles.error} testID="import-error">
            <Icon name="alert-circle-outline" size={18} color={colors.danger} />
            <Body style={styles.errorText}>{error}</Body>
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {busy ? (
          <View style={styles.busy} testID="import-busy">
            <ActivityIndicator color={colors.green} />
            <Title style={styles.busyText}>
              {stage === 'reading' ? 'Sto leggendo il file…' : 'Sto preparando il tuo piano…'}
            </Title>
          </View>
        ) : (
          <>
            <Button
              label={ready ? 'Carica la dieta (PDF o Word)' : 'Preparazione…'}
              icon="cloud-upload-outline"
              onPress={importFromPicker}
              disabled={!ready}
              testID="import-pick"
            />
            {hasPlan ? (
              <Button
                label="Torna al piano attuale"
                variant="ghost"
                size="sm"
                onPress={() => router.replace('/oggi')}
                style={styles.footerGhost}
                testID="import-back"
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#B9E3C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#B9E3C6', letterSpacing: 2.4, fontSize: 12 },
  heroTitle: { color: colors.white, marginTop: spacing.xl },
  heroBody: { color: '#D2E8DA', marginTop: spacing.md, fontSize: 14, lineHeight: 21 },
  content: { padding: spacing.xl, gap: spacing.lg },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, paddingTop: 2 },
  stepText: { marginTop: 2 },
  privacy: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
  },
  privacyBody: { flex: 1 },
  error: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: 'flex-start',
    backgroundColor: colors.terracottaSoft,
    borderColor: '#F0CDBE',
  },
  errorText: { flex: 1, fontSize: 14, color: colors.danger },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  footerGhost: { alignSelf: 'center' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 48 },
  busyText: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
