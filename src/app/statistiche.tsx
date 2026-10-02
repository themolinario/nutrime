import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, Display, Heading, Muted, Overline } from '../components/ui';
import { setAnalyticsConsent } from '../lib/analytics';
import { useDietStore } from '../lib/store/useDietStore';
import { colors, spacing } from '../theme';
import { Icon, type IconName } from '../components/Icon';

const SENT = [
  'Quali schermate apri e quali funzioni usi, ad esempio «Compila per me» o la spesa',
  'Quanti pasti ha il piano e quanto ci mette a leggerlo',
  'Sistema (iOS o Android) e versione dell’app',
];

const NEVER_SENT = [
  'Il PDF, gli alimenti, le quantità, il peso o altri dati del piano',
  'Nome, email o il tuo account',
];

/**
 * Asks once, after the introduction, whether anonymous usage statistics may be
 * sent. Existing users land here once on their next launch. Nothing is sent
 * before a yes; the answer can be changed in Piano.
 */
export default function StatsConsentScreen() {
  const insets = useSafeAreaInsets();

  const answer = (value: boolean) => {
    setAnalyticsConsent(value);
    const { authPrompted, plan } = useDietStore.getState();
    // First run continues with the online backup offer, as before.
    router.replace(!authPrompted ? '/accesso?first=1' : plan ? '/oggi' : '/importa');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoMark}>
          <Icon name="bar-chart" size={17} color={colors.white} />
        </View>
        <Overline style={styles.overline}>Statistiche anonime</Overline>
        <Display style={styles.title}>Ci aiuti a migliorare NutriMy?</Display>
        <Body style={styles.intro}>
          Se sei d’accordo, NutriMy ci dice in forma anonima come viene usata: così capiamo cosa
          funziona e cosa sistemare. Puoi cambiare idea quando vuoi da Piano.
        </Body>

        <Card style={styles.card}>
          <Heading>Cosa riceviamo</Heading>
          {SENT.map((text) => (
            <Row key={text} icon="checkmark-circle" tint={colors.green} text={text} />
          ))}
        </Card>

        <Card style={styles.card}>
          <Heading>Cosa non riceviamo mai</Heading>
          {NEVER_SENT.map((text) => (
            <Row key={text} icon="close-circle" tint={colors.terracotta} text={text} />
          ))}
        </Card>

        <Muted style={styles.note}>
          I dati sono legati solo a un codice casuale creato sul telefono, non a te, e vengono
          cancellati dopo 14 mesi. Nessuna pubblicità, nessun tracciamento tra app.
        </Muted>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          label="Sì, va bene"
          icon="checkmark"
          onPress={() => answer(true)}
          testID="stats-yes"
        />
        <Button
          label="No, grazie"
          variant="ghost"
          onPress={() => answer(false)}
          testID="stats-no"
        />
      </View>
    </View>
  );
}

function Row({ icon, tint, text }: { icon: IconName; tint: string; text: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={tint} style={styles.rowIcon} />
      <Body style={styles.rowText}>{text}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: { color: colors.green, marginTop: spacing.md },
  title: { fontSize: 32, lineHeight: 38, marginTop: -spacing.sm },
  intro: { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowIcon: { marginTop: 2 },
  rowText: { flex: 1, fontSize: 14.5, lineHeight: 21 },
  note: { fontSize: 12.5, lineHeight: 18, paddingHorizontal: spacing.xs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
