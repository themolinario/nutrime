import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, CheckCircle, Display, Heading, Muted, Overline } from '../components/ui';
import { useDietStore } from '../lib/store/useDietStore';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Icon, type IconName } from '../components/Icon';

type Step = {
  overline: string;
  title: string;
  intro: string;
  points: { icon: IconName; text: string }[];
  art: ReactNode;
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const hasPlan = useDietStore((s) => s.plan !== null);
  const setOnboarded = useDietStore((s) => s.setOnboarded);

  const steps: Step[] = [
    {
      overline: '1 di 3 · Il piano',
      title: 'Carica il PDF della dieta',
      intro:
        'Quello del nutrizionista, così com’è. NutriMy legge pasti, tabelle, alternative e grammature e lo trasforma nel tuo piano.',
      points: [
        {
          icon: 'document-attach-outline',
          text: 'Sceglilo da File, oppure condividilo con NutriMy da Mail o WhatsApp.',
        },
        {
          icon: 'sparkles-outline',
          text: 'In pochi secondi trovi tutto nella scheda Piano, diviso per pasto e giorni.',
        },
        {
          icon: 'lock-closed-outline',
          text: 'Il PDF viene letto sul telefono. Se vuoi, un account gratuito salva tutto online.',
        },
      ],
      art: <PdfArt />,
    },
    {
      overline: '2 di 3 · La giornata',
      title: 'Scegli, mangia, spunta',
      intro:
        'Ogni tabella del piano è una scelta: in Oggi decidi cosa mangiare e spunti man mano quello che hai mangiato.',
      points: [
        {
          icon: 'hand-left-outline',
          text: 'Tocca una riga per scegliere l’alimento, oppure lascia fare a «Compila per me», che varia da solo.',
        },
        {
          icon: 'checkmark-circle-outline',
          text: 'Tocca il cerchio quando hai mangiato: la barra ti dice quanto manca.',
        },
        {
          icon: 'notifications-outline',
          text: 'Imposta un promemoria per ogni pasto, aggiungi il widget alla Home e condividi il menu in PDF.',
        },
      ],
      art: <DayArt />,
    },
    {
      overline: '3 di 3 · La spesa',
      title: 'La lista si fa da sola',
      intro:
        'Somma le quantità degli alimenti scelti nei prossimi 3, 7 o 14 giorni e le divide per reparto.',
      points: [
        {
          icon: 'calendar-outline',
          text: 'Prepara i giorni in Settimana: la lista si aggiorna a ogni scelta.',
        },
        { icon: 'cart-outline', text: 'Spunta quello che metti nel carrello mentre fai la spesa.' },
        {
          icon: 'add-circle-outline',
          text: 'Aggiungi a mano quello che manca e condividi la lista con chi va a fare la spesa.',
        },
      ],
      art: <ShoppingArt />,
    },
  ];

  const last = page === steps.length - 1;

  const finish = () => {
    setOnboarded(true);
    if (router.canGoBack()) router.back();
    // First run: ask about statistics, then offer the online backup.
    else if (useDietStore.getState().analyticsConsent === null) router.replace('/statistiche');
    else if (!useDietStore.getState().authPrompted) router.replace('/accesso?first=1');
    else router.replace(hasPlan ? '/oggi' : '/importa');
  };

  const goTo = (index: number) => {
    scroll.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Icon name="leaf" size={15} color={colors.white} />
          </View>
          <Overline style={styles.logoText}>NutriMy</Overline>
        </View>
        {!last ? (
          <Pressable onPress={finish} hitSlop={12} testID="onboarding-skip">
            <Body style={styles.skip}>Salta</Body>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        testID="onboarding-pager"
      >
        {steps.map((step, index) => (
          <ScrollView
            key={step.title}
            style={{ width }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
            testID={`onboarding-step-${index + 1}`}
          >
            <View style={styles.art}>{step.art}</View>
            <Overline style={styles.stepOverline}>{step.overline}</Overline>
            <Display style={styles.title}>{step.title}</Display>
            <Body style={styles.intro}>{step.intro}</Body>
            <View style={styles.points}>
              {step.points.map((point) => (
                <View key={point.text} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <Icon name={point.icon} size={17} color={colors.green} />
                  </View>
                  <Body style={styles.pointText}>{point.text}</Body>
                </View>
              ))}
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {steps.map((step, index) => (
            <View key={step.title} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={last ? (hasPlan ? 'Torna all’app' : 'Carica il PDF') : 'Avanti'}
          icon={last ? (hasPlan ? 'checkmark' : 'cloud-upload-outline') : 'arrow-forward'}
          onPress={last ? finish : () => goTo(page + 1)}
          testID="onboarding-next"
        />
      </View>
    </View>
  );
}

/* Illustrations: miniature versions of the real screens, drawn with views. */

function PdfArt() {
  return (
    <View style={art.row}>
      <View style={[art.tile, art.doc]}>
        <Icon name="document-text" size={30} color={colors.terracotta} />
        <View style={art.line} />
        <View style={[art.line, { width: 34 }]} />
        <View style={[art.line, { width: 42 }]} />
        <Overline style={art.docLabel}>PDF</Overline>
      </View>
      <View style={art.arrow}>
        <Icon name="sparkles" size={18} color={colors.amber} />
        <Icon name="arrow-forward" size={20} color={colors.textFaint} />
      </View>
      <View style={[art.tile, art.plan]}>
        {['Colazione', 'Pranzo', 'Cena'].map((meal, i) => (
          <View key={meal} style={art.planRow}>
            <View
              style={[
                art.planDot,
                { backgroundColor: [colors.amber, colors.terracotta, colors.green][i] },
              ]}
            />
            <Muted style={art.planText}>{meal}</Muted>
          </View>
        ))}
      </View>
    </View>
  );
}

function DayArt() {
  const rows = [
    { name: 'Pasta di farro', qty: 'g 120', done: true },
    { name: 'Salmone affumicato', qty: 'g 40', done: false },
    { name: 'Asparagi', qty: 'g 200', done: false },
  ];
  return (
    <View style={[art.card, { width: 270 }]}>
      <View style={art.cardHeader}>
        <View style={[art.mealIcon, { backgroundColor: colors.terracottaSoft }]}>
          <Icon name="restaurant-outline" size={15} color={colors.terracotta} />
        </View>
        <Heading style={art.cardTitle}>Pranzo</Heading>
        <Overline style={{ color: colors.terracotta }}>1/3</Overline>
      </View>
      <View style={art.progress}>
        <View style={[art.progressFill, { width: '33%', backgroundColor: colors.terracotta }]} />
      </View>
      {rows.map((row) => (
        <View key={row.name} style={art.itemRow}>
          <CheckCircle checked={row.done} size={20} tint={colors.terracotta} />
          <Body style={[art.itemName, row.done && art.itemDone]}>{row.name}</Body>
          <Muted style={art.itemQty}>{row.qty}</Muted>
        </View>
      ))}
    </View>
  );
}

function ShoppingArt() {
  const rows = [
    { name: 'Fiocchi d’avena', qty: 'g 350', done: true },
    { name: 'Salmone affumicato', qty: 'g 120', done: false },
    { name: 'Asparagi', qty: 'g 600', done: false },
  ];
  return (
    <View style={[art.card, { width: 270 }]}>
      <View style={art.cardHeader}>
        <View style={[art.mealIcon, { backgroundColor: colors.greenSoft }]}>
          <Icon name="cart-outline" size={15} color={colors.green} />
        </View>
        <Heading style={art.cardTitle}>Prossimi 7 giorni</Heading>
        <Overline style={{ color: colors.green }}>1/3</Overline>
      </View>
      {rows.map((row) => (
        <View key={row.name} style={art.itemRow}>
          <CheckCircle checked={row.done} size={20} />
          <Body style={[art.itemName, row.done && art.itemDone]}>{row.name}</Body>
          <Body style={art.shopQty}>{row.qty}</Body>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.green },
  skip: { fontFamily: fonts.bodySemi, color: colors.textMuted },
  page: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  art: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSunken,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  stepOverline: { color: colors.green },
  title: { marginTop: spacing.xs, fontSize: 32, lineHeight: 38 },
  intro: { marginTop: spacing.md, color: colors.textMuted, lineHeight: 22 },
  points: { marginTop: spacing.xl, gap: spacing.lg },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, lineHeight: 21, paddingTop: 5 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.green },
});

const art = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: {
    width: 104,
    height: 132,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadow.card,
  },
  doc: { alignItems: 'flex-start', gap: 7 },
  line: { height: 5, width: 60, borderRadius: 3, backgroundColor: colors.border },
  docLabel: { marginTop: 'auto', color: colors.terracotta },
  arrow: { alignItems: 'center', gap: 4 },
  plan: { justifyContent: 'center', gap: spacing.md },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  planDot: { width: 9, height: 9, borderRadius: 5 },
  planText: { fontSize: 12, fontFamily: fonts.bodyMedium, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 15 },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.bgSunken, overflow: 'hidden' },
  progressFill: { height: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  itemName: { flex: 1, fontSize: 13.5 },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  itemQty: { fontSize: 12.5 },
  shopQty: { fontSize: 13, fontFamily: fonts.bodySemi, color: colors.green },
});
