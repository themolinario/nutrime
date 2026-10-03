import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { todayISO } from '../../lib/dates';
import type { Species } from '../../lib/garden';
import { sampleCelebrations, useCelebration } from '../../lib/plant';
import { useHarvestWhenReady, usePlantStatus } from '../../lib/usePlantCelebrations';
import { colors, fonts, radius, spacing } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Body, Muted, ProgressBar } from '../ui';
import { BOX } from './geometry';
import { Plant } from './Plant';
import { lookOf, type Look } from './species';

const ICON_TINT: Partial<Record<IconName, string>> = { flame: colors.terracotta };

const SLOT = { width: 56, height: 62 };

/**
 * Scale and lift that keep the drawing whole and centred in a slot: a bare pot
 * is small and sits low in its box, a grown plant fills it.
 */
export function fitPlant(grow: number, look: Look, slot = SLOT) {
  const top = look.tops[Math.min(5, Math.ceil(grow))];
  const height = look.pot.bottom - top;
  const scale = Math.min(slot.width / BOX.width, slot.height / height);
  return { size: BOX.width * scale, offset: (slot.height - height * scale) / 2 - top * scale };
}

let preview = 0;

/** Development only: plays the next kind of celebration. */
function playNextSample() {
  const samples = sampleCelebrations(todayISO());
  useCelebration.getState().show(samples[preview++ % samples.length]);
}

type Status = {
  species: Species;
  progress: number;
  dry: boolean;
  doneToday: boolean;
  waiting: boolean;
};

function copy(status: Status | null): [IconName, string, string] {
  if (!status) return ['plant', 'Scegli cosa coltivare', 'Apri la serra e pianta un seme'];
  const { species, progress, dry, doneToday, waiting } = status;
  if (waiting) return ['leaf', `${species.name}: seme pronto`, 'Si comincia domani'];
  if (progress === 0) {
    return ['leaf', `${species.name}: seme piantato`, 'Completa la giornata per farlo germogliare'];
  }
  if (dry) return ['drop', `${species.name} si sta seccando!`, 'Completa oggi per salvare la serie'];
  const title = `${species.name} · ${progress} di ${species.days}`;
  if (doneToday) return ['flame', title, 'Annaffiata anche oggi'];
  return ['flame', title, 'Completa oggi per farla crescere'];
}

/** The plant being grown as it stands today; a tap opens the greenhouse. */
export function PlantBadge() {
  const status = usePlantStatus();
  const growing = status.growing ? status : null;
  const isDry = growing?.dry ?? false;
  const target = growing && !growing.waiting ? growing.grow : 0;
  useHarvestWhenReady(growing?.ready ?? false, status.today);

  const grow = useSharedValue(target);
  const dry = useSharedValue(isDry ? 1 : 0);
  const glow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(target, { duration: 600 });
    dry.value = withTiming(isDry ? 1 : 0, { duration: 600 });
  }, [target, isDry, grow, dry]);

  const [icon, title, subtitle] = copy(growing);
  const species = growing?.species.id ?? null;
  const fit = fitPlant(target, lookOf(species));

  return (
    <Pressable
      onPress={() => router.push('/serra')}
      onLongPress={__DEV__ ? playNextSample : undefined}
      style={({ pressed }) => [styles.card, isDry && styles.cardDry, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint="Apre la serra"
      testID="plant-badge"
    >
      <View style={styles.plant}>
        <View style={{ transform: [{ translateY: fit.offset }] }}>
          {/* Still: an always-visible drawing animating every frame is too much work for the UI thread on Android. */}
          <Plant size={fit.size} grow={grow} dry={dry} glow={glow} species={species} live={false} />
        </View>
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Icon name={icon} size={16} color={isDry ? colors.amber : ICON_TINT[icon] ?? colors.green} />
          <Body style={styles.title} numberOfLines={1}>
            {title}
          </Body>
        </View>
        <Muted>{subtitle}</Muted>
        {growing && growing.progress > 0 ? (
          <View style={styles.bar}>
            <ProgressBar
              value={growing.progress / growing.species.days}
              tint={isDry ? colors.amber : colors.green}
              track={colors.white}
              height={5}
            />
          </View>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  cardDry: { backgroundColor: colors.amberSoft, borderColor: '#F1D5A6' },
  pressed: { opacity: 0.85 },
  plant: { ...SLOT, overflow: 'hidden', alignItems: 'center' },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, flexShrink: 1 },
  bar: { marginTop: 6 },
});
