import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { todayISO } from '../../lib/dates';
import { FULL_GROWN, sampleCelebrations, stageOf, useCelebration } from '../../lib/plant';
import { usePlantStatus } from '../../lib/usePlantCelebrations';
import { colors, fonts, radius, spacing } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Body, Muted } from '../ui';
import { BOX, STEM_BY_STAGE, stemPoint } from './geometry';
import { Plant } from './Plant';

/** Where the pot's shadow ends, in the drawing's coordinates. */
const POT_BOTTOM = 302;

const ICON_TINT: Partial<Record<IconName, string>> = { flame: colors.terracotta };

const SLOT = { width: 56, height: 62 };

/**
 * Scale and lift that keep the drawing whole and centred in the badge: a bare pot
 * is small and sits low in its box, a plant in flower fills it.
 */
function fitPlant(stage: number) {
  const top =
    stage === 0 ? 207 : stage < 4 ? stemPoint(STEM_BY_STAGE[stage]).y - 18 : stage === 4 ? 42 : 20;
  const height = POT_BOTTOM - top;
  const scale = Math.min(SLOT.width / BOX.width, SLOT.height / height);
  return { size: BOX.width * scale, offset: (SLOT.height - height * scale) / 2 - top * scale };
}

let preview = 0;

/** Development only: plays the next kind of celebration. */
function playNextSample() {
  const samples = sampleCelebrations(todayISO());
  useCelebration.getState().show(samples[preview++ % samples.length]);
}

function copy({
  streak,
  dry,
  doneToday,
}: {
  streak: number;
  dry: boolean;
  doneToday: boolean;
}): [IconName, string, string] {
  if (streak === 0) return ['leaf', 'Pianta il tuo seme', 'Completa la giornata e inizia a crescere'];
  if (dry) return ['drop', 'Si sta seccando!', 'Completa oggi per salvare la serie'];
  const days = streak === 1 ? '1 giorno' : `${streak} giorni di fila`;
  if (doneToday) return ['flame', days, 'Annaffiata anche oggi'];
  return [
    'flame',
    days,
    streak >= FULL_GROWN ? 'Completa oggi per tenerla accesa' : 'Completa oggi per farla crescere',
  ];
}

/** The habit plant as it stands today; a tap replays the last celebration. */
export function PlantBadge() {
  const status = usePlantStatus();
  const { streak, dry: isDry, replay } = status;

  const grow = useSharedValue(stageOf(streak));
  const dry = useSharedValue(isDry ? 1 : 0);
  const glow = useSharedValue(streak > FULL_GROWN ? 1 : 0);
  useEffect(() => {
    grow.value = withTiming(stageOf(streak), { duration: 600 });
    dry.value = withTiming(isDry ? 1 : 0, { duration: 600 });
    glow.value = withTiming(streak > FULL_GROWN ? 1 : 0, { duration: 600 });
  }, [streak, isDry, grow, dry, glow]);

  const [icon, title, subtitle] = copy(status);
  const fit = fitPlant(stageOf(streak));

  return (
    <Pressable
      onPress={streak === 0 || isDry ? undefined : replay}
      onLongPress={__DEV__ ? playNextSample : undefined}
      style={({ pressed }) => [styles.card, isDry && styles.cardDry, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      testID="plant-badge"
    >
      <View style={styles.plant}>
        <View style={{ transform: [{ translateY: fit.offset }] }}>
          {/* Still: an always-visible drawing animating every frame is too much work for the UI thread on Android. */}
          <Plant size={fit.size} grow={grow} dry={dry} glow={glow} live={false} />
        </View>
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Icon name={icon} size={16} color={isDry ? colors.amber : ICON_TINT[icon] ?? colors.green} />
          <Body style={styles.title}>{title}</Body>
        </View>
        <Muted>{subtitle}</Muted>
      </View>
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
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
