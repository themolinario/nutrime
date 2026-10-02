import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { fitPlant } from '../components/plant/PlantBadge';
import { Plant, PlantPicture } from '../components/plant/Plant';
import { lookOf } from '../components/plant/species';
import { Body, Card, Display, Heading, Muted, Overline, Pill, ProgressBar, Title } from '../components/ui';
import { track } from '../lib/analytics';
import { addDays, formatDayMonth } from '../lib/dates';
import { grownCount, missingFor, SPECIES, type Species, type SpeciesId } from '../lib/garden';
import { plantStatus } from '../lib/plant';
import { useDietStore } from '../lib/store/useDietStore';
import { useHarvestWhenReady, usePlantStatus } from '../lib/usePlantCelebrations';
import { colors, fonts, radius, spacing } from '../theme';
import { showDialog } from '../lib/dialog';

/** A plant held still at a given growth, fitted in a small slot. */
function StillPlant({
  species,
  grow = 5,
  slot,
}: {
  species: SpeciesId | null;
  grow?: number;
  slot: { width: number; height: number };
}) {
  const fit = fitPlant(grow, lookOf(species), slot);
  return (
    <View style={[slot, styles.still]}>
      <View style={{ transform: [{ translateY: fit.offset }] }}>
        <PlantPicture size={fit.size} grow={grow} species={species} />
      </View>
    </View>
  );
}

const HERO = { width: 150, height: 170 };

/** The plant being grown, big and alive, with how far it has got. */
function Growing() {
  const status = usePlantStatus();
  const uproot = useDietStore((s) => s.uproot);
  const growing = status.growing ? status : null;
  const target = growing && !growing.waiting ? growing.grow : 0;
  const isDry = growing?.dry ?? false;
  useHarvestWhenReady(growing?.ready ?? false, status.today);

  const grow = useSharedValue(target);
  const dry = useSharedValue(isDry ? 1 : 0);
  const glow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(target, { duration: 600 });
    dry.value = withTiming(isDry ? 1 : 0, { duration: 600 });
  }, [target, isDry, grow, dry]);

  const species = growing?.species ?? null;
  const fit = fitPlant(target, lookOf(species?.id), HERO);

  const giveUp = () => {
    if (!growing) return;
    const lost = growing.progress;
    showDialog(
      `Abbandonare ${growing.species.name.toLowerCase()}?`,
      lost > 0
        ? `Perderai ${lost === 1 ? 'il giorno' : `i ${lost} giorni`} fatti finora: valgono solo per questa pianta.`
        : 'Potrai scegliere un altro seme.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Abbandona',
          style: 'destructive',
          onPress: () => {
            track('plant_uprooted', { species: growing.species.id, progress: lost });
            uproot();
          },
        },
      ],
    );
  };

  const canReplay = growing && growing.progress > 0 && !growing.dry;

  return (
    <Card style={[styles.hero, isDry && styles.heroDry]}>
      <Pressable
        onPress={canReplay ? growing.replay : undefined}
        style={[HERO, styles.still]}
        accessibilityRole={canReplay ? 'button' : undefined}
        accessibilityLabel={canReplay ? 'Rivedi l’ultima crescita' : undefined}
        testID="garden-hero-plant"
      >
        <View style={{ transform: [{ translateY: fit.offset }] }}>
          <Plant size={fit.size} grow={grow} dry={dry} glow={glow} species={species?.id} />
        </View>
      </Pressable>

      {growing && species ? (
        <View style={styles.heroText}>
          <Overline>In crescita</Overline>
          <Title>{species.name}</Title>
          <Muted>
            {growing.waiting
              ? 'Seme pronto: si comincia domani'
              : growing.dry
                ? 'Si sta seccando: completa oggi per salvarla'
                : growing.progress === 0
                  ? 'Completa la giornata per farlo germogliare'
                  : `Giorno ${growing.progress} di ${species.days}`}
          </Muted>
          <View style={styles.heroBar}>
            <ProgressBar
              value={growing.progress / species.days}
              tint={isDry ? colors.amber : colors.green}
              track={colors.white}
            />
            <Muted style={styles.heroLeft}>
              {species.days - growing.progress === 1
                ? 'Manca 1 giorno'
                : `Mancano ${species.days - growing.progress} giorni`}
            </Muted>
          </View>
          <Pressable onPress={giveUp} hitSlop={8} style={styles.giveUp} testID="garden-uproot">
            <Muted style={styles.giveUpText}>Abbandona</Muted>
          </Pressable>
        </View>
      ) : (
        <View style={styles.heroText}>
          <Overline>Vaso vuoto</Overline>
          <Title>Scegli un seme</Title>
          <Muted>
            Ogni pianta cresce con i giorni completi di fila. I giorni valgono solo per la pianta che
            hai scelto: se cambi, ricominci da capo.
          </Muted>
        </View>
      )}
    </Card>
  );
}

const TILE = { width: 76, height: 88 };

/** The plants grown so far, each once with how many times. */
function Shelf() {
  const garden = useDietStore((s) => s.garden);
  const count = grownCount(garden);
  const lastOn = useMemo(() => {
    const out: Partial<Record<SpeciesId, string>> = {};
    for (const { species, on } of garden.grown) out[species] = on;
    return out;
  }, [garden.grown]);
  const grown = SPECIES.filter((s) => count[s.id]);

  if (!grown.length) {
    return (
      <Card style={styles.shelfEmpty}>
        <Icon name="plant" size={22} color={colors.textFaint} />
        <Muted style={styles.shelfEmptyText}>
          Le piante che porti a termine vengono a vivere qui.
        </Muted>
      </Card>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.shelf}
      testID="garden-shelf"
    >
      {grown.map((s) => (
        <View
          key={s.id}
          style={styles.tile}
          accessible
          accessibilityLabel={`${s.name}, cresciuta ${count[s.id]} ${count[s.id] === 1 ? 'volta' : 'volte'}`}
        >
          <StillPlant species={s.id} slot={TILE} />
          <Body style={styles.tileName} numberOfLines={1}>
            {s.name}
          </Body>
          <Muted style={styles.tileMeta}>
            {count[s.id]! > 1 ? `×${count[s.id]}` : formatDayMonth(lastOn[s.id]!)}
          </Muted>
        </View>
      ))}
    </ScrollView>
  );
}

const SEED = { width: 56, height: 66 };

function SeedRow({
  species,
  growingId,
  timesGrown,
  missing,
  onPress,
}: {
  species: Species;
  growingId: SpeciesId | null;
  timesGrown: number;
  missing: Species[];
  onPress: () => void;
}) {
  const locked = missing.length > 0;
  const current = growingId === species.id;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.seed, current && styles.seedCurrent, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${species.name}, ${species.days} giorni${locked ? ', bloccata' : ''}`}
      testID={`garden-seed-${species.id}`}
    >
      <View style={locked && styles.lockedArt}>
        <StillPlant species={species.id} slot={SEED} />
      </View>
      <View style={styles.seedText}>
        <View style={styles.seedTitleRow}>
          <Heading style={styles.seedName}>{species.name}</Heading>
          <Pill label={`${species.days} giorni`} tone={locked ? 'neutral' : 'green'} />
        </View>
        {locked ? (
          <View style={styles.lockRow}>
            <Icon name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Muted style={styles.flex}>
              Completa prima {missing.map((m) => m.name.toLowerCase()).join(' e ')}
            </Muted>
          </View>
        ) : (
          <Muted>{species.blurb}</Muted>
        )}
        <View style={styles.seedMeta}>
          <Muted style={styles.real}>{species.real}</Muted>
          {current ? (
            <Pill label="In crescita" tone="green" />
          ) : timesGrown ? (
            <Pill label={timesGrown > 1 ? `In serra ×${timesGrown}` : 'In serra'} tone="amber" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function GreenhouseScreen() {
  const insets = useSafeAreaInsets();
  const garden = useDietStore((s) => s.garden);
  const sow = useDietStore((s) => s.sow);
  const status = usePlantStatus();
  const count = grownCount(garden);
  const growing = status.growing ? status : null;

  const plant = (species: Species) => {
    // A day already complete doesn't count for a seed sown after it: the days
    // belong to the plant they were spent on.
    const { doneToday } = plantStatus(status.days, status.today, status.rest);
    const since = doneToday ? addDays(status.today, 1) : status.today;
    track('plant_sown', { species: species.id, days: species.days });
    sow(species.id, since);
  };

  const choose = (species: Species) => {
    const missing = missingFor(species, garden);
    if (missing.length) {
      showDialog(
        `${species.name} è ancora bloccata`,
        `Per sbloccarla porta nella serra ${missing.map((m) => m.name.toLowerCase()).join(' e ')}.`,
        undefined,
        { icon: 'lock-closed-outline' },
      );
      return;
    }
    if (growing?.species.id === species.id) return;

    const length = `Ti servono ${species.days} giorni di fila con la giornata completa: un giorno saltato la fa seccare, due di fila la fanno ripartire dal seme.`;
    if (growing && growing.progress > 0) {
      showDialog(
        `Piantare ${species.name.toLowerCase()} al posto di ${growing.species.name.toLowerCase()}?`,
        `Perderai ${growing.progress === 1 ? 'il giorno fatto' : `i ${growing.progress} giorni fatti`}: i giorni non passano da una pianta all’altra.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Cambia pianta', style: 'destructive', onPress: () => plant(species) },
        ],
      );
      return;
    }
    showDialog(`Piantare ${species.name.toLowerCase()}?`, length, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Pianta', onPress: () => plant(species) },
    ], { icon: 'leaf' });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      testID="garden-scroll"
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={styles.back}
        accessibilityLabel="Indietro"
        testID="garden-back"
      >
        <Icon name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <View>
        <Overline>Le tue piante</Overline>
        <Display style={styles.title}>Serra</Display>
      </View>

      <Growing />

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Overline>Nella serra</Overline>
          <Muted style={styles.sectionCount}>
            {Object.keys(count).length} di {SPECIES.length}
          </Muted>
        </View>
        <Shelf />
      </View>

      <View style={styles.section}>
        <Overline>Semi</Overline>
        <Card style={styles.seeds}>
          {SPECIES.map((s, i) => (
            <View key={s.id} style={i > 0 && styles.seedBorder}>
              <SeedRow
                species={s}
                growingId={growing?.species.id ?? null}
                timesGrown={count[s.id] ?? 0}
                missing={missingFor(s, garden)}
                onPress={() => choose(s)}
              />
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
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
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  still: { overflow: 'hidden', alignItems: 'center' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.greenSoft,
    borderColor: colors.greenBorder,
  },
  heroDry: { backgroundColor: colors.amberSoft, borderColor: '#F1D5A6' },
  heroText: { flex: 1, gap: 4 },
  heroBar: { marginTop: spacing.sm, gap: 6 },
  heroLeft: { fontSize: 12 },
  giveUp: { alignSelf: 'flex-start', marginTop: spacing.sm },
  giveUpText: { textDecorationLine: 'underline', fontSize: 12 },

  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionCount: { fontSize: 12 },
  shelf: { gap: spacing.sm, paddingRight: spacing.lg },
  shelfEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderStyle: 'dashed',
  },
  shelfEmptyText: { flex: 1 },
  tile: {
    width: TILE.width + spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileName: { fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 4 },
  tileMeta: { fontSize: 11 },

  seeds: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  seedBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  seed: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  seedCurrent: { opacity: 0.6 },
  lockedArt: { opacity: 0.3 },
  seedText: { flex: 1, gap: 3 },
  seedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seedName: { flexShrink: 1 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seedMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  real: { flex: 1, fontSize: 12, color: colors.textFaint },
});
