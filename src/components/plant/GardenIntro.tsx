import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';

import { track } from '../../lib/analytics';
import type { SpeciesId } from '../../lib/garden';
import { useCelebration } from '../../lib/plant';
import { useDietStore, useHydrated } from '../../lib/store/useDietStore';
import { colors, fonts, radius, shadow, spacing } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Muted, Overline, Title } from '../ui';
import { PlantPicture } from './Plant';

/** A few plants, short to long, to show what the greenhouse holds. */
const SHOWCASE: { species: SpeciesId; size: number }[] = [
  { species: 'crescione', size: 62 },
  { species: 'girasole', size: 78 },
  { species: 'ulivo', size: 92 },
  { species: 'pomodoro', size: 78 },
  { species: 'fragola', size: 62 },
];

const POINTS: [IconName, string][] = [
  ['plant', '10 piante da far crescere, una alla volta'],
  ['flame', 'Ogni giornata completa la fa crescere'],
  ['lock-closed-outline', 'Da 5 a 60 giorni: le più rare si sbloccano strada facendo'],
];

/** Waits a moment on the main screen, so it doesn't land on top of the first frame. */
const DELAY = 900;

/**
 * Introduces the greenhouse once per phone, the first time the main tabs open.
 * Phones already growing something have found it on their own and skip it.
 */
export function GardenIntro() {
  const hydrated = useHydrated();
  const seen = useDietStore((s) => s.gardenIntroSeen);
  const started = useDietStore((s) => s.garden.growing !== null || s.garden.grown.length > 0);
  const celebrating = useCelebration((s) => s.current !== null);
  const setSeen = useDietStore((s) => s.setGardenIntroSeen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated || seen) return;
    if (started) {
      setSeen();
      return;
    }
    const timer = setTimeout(() => setReady(true), DELAY);
    return () => clearTimeout(timer);
  }, [hydrated, seen, started, setSeen]);

  if (!ready || seen || celebrating) return null;

  const close = (open: boolean) => {
    track('garden_intro', { action: open ? 'open' : 'later' });
    setSeen();
    if (open) router.push('/serra');
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(false)}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Animated.View
          entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
          style={styles.card}
          accessibilityViewIsModal
          testID="garden-intro"
        >
          <View style={styles.stage}>
            <View style={styles.sun} />
            <View style={styles.plants}>
              {SHOWCASE.map(({ species, size }) => (
                <View key={species} style={styles.plant}>
                  <PlantPicture size={size} grow={5} species={species} />
                </View>
              ))}
            </View>
            <View style={styles.shelf} />
          </View>

          <View style={styles.body}>
            <View style={styles.badge}>
              <Icon name="sparkles" size={13} color={colors.terracotta} />
              <Text style={styles.badgeText}>Novità</Text>
            </View>
            <Title style={styles.title}>Coltiva la tua serra</Title>
            <Muted style={styles.lead}>
              La costanza adesso mette radici: scegli un seme e fallo crescere giorno dopo giorno,
              fino a portarlo nella tua serra.
            </Muted>

            <View style={styles.points}>
              {POINTS.map(([icon, text]) => (
                <View key={text} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <Icon name={icon} size={15} color={colors.green} />
                  </View>
                  <Text style={styles.pointText}>{text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => close(true)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              accessibilityRole="button"
              testID="garden-intro-open"
            >
              <Icon name="leaf" size={17} color={colors.white} />
              <Text style={styles.primaryText}>Scegli il primo seme</Text>
            </Pressable>
            <Pressable
              onPress={() => close(false)}
              hitSlop={8}
              style={styles.later}
              accessibilityRole="button"
              testID="garden-intro-later"
            >
              <Overline style={styles.laterText}>Più tardi</Overline>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(20, 30, 24, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    ...shadow.raised,
  },
  stage: {
    height: 170,
    backgroundColor: colors.greenSoft,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFF1C2',
  },
  plants: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    marginBottom: -6,
  },
  plant: { alignItems: 'center' },
  shelf: { height: 14, backgroundColor: '#C9B79A', borderTopWidth: 3, borderTopColor: '#2B2A1F' },
  body: { padding: spacing.xl, paddingTop: spacing.lg, alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.terracottaSoft,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.terracotta },
  title: { marginTop: spacing.sm, fontSize: 24, lineHeight: 30, textAlign: 'center' },
  lead: { textAlign: 'center', marginTop: spacing.xs, fontSize: 14, lineHeight: 20 },
  points: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pointIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenSoft,
  },
  pointText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  primary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
  },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.white },
  later: { marginTop: spacing.md, padding: spacing.xs },
  laterText: { color: colors.textMuted },
});
