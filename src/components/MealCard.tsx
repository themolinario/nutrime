import * as Haptics from 'expo-haptics';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addedCategoryId, type AddedFood, type DayExtras } from '../lib/diet/day';
import { slotKey } from '../lib/diet/slots';
import type { FoodCategory, ResolvedMeal } from '../lib/diet/types';
import { accentFor, colors, fonts, radius, spacing } from '../theme';
import { TipAnchor } from './Tip';
import { Body, Card, CheckCircle, Heading, Muted, Overline, ProgressBar } from './ui';
import { Icon } from './Icon';

/** What the quantity pill of a row refers to. */
export type QtyTarget = { category: FoodCategory } | { food: AddedFood };

type Props = {
  meal: ResolvedMeal;
  choices: Record<string, string> | undefined;
  eaten: Record<string, boolean> | undefined;
  /** Foods added and quantities edited for this day. */
  extras?: DayExtras;
  onPickCategory: (meal: ResolvedMeal, category: FoodCategory) => void;
  /** Ticks a plan table (its id) or an added food (`addedCategoryId`). */
  onToggleEaten?: (meal: ResolvedMeal, categoryId: string) => void;
  /** Ticks every chosen food of the meal at once, or unticks them all when they're done. */
  onToggleMeal?: (meal: ResolvedMeal, eaten: boolean) => void;
  /** Today only: quantities become tappable and foods can be added. */
  editable?: boolean;
  onEditQty?: (meal: ResolvedMeal, target: QtyTarget) => void;
  onAddFood?: (meal: ResolvedMeal) => void;
  /** Read-only cards hide the checkboxes, e.g. in the week overview. */
  readOnly?: boolean;
  /** Points the "edit quantity" tooltip at the first quantity of the card. */
  qtyTip?: boolean;
};

export function MealCard({
  meal,
  choices,
  eaten,
  extras,
  onPickCategory,
  onToggleEaten,
  onToggleMeal,
  editable,
  onEditQty,
  onAddFood,
  readOnly,
  qtyTip,
}: Props) {
  const accent = accentFor(meal.key);
  const added = extras?.added?.[meal.key] ?? [];
  const total = meal.categories.length + added.length;
  const isDone = (categoryId: string) => !!eaten?.[slotKey(meal.key, categoryId)];
  const done =
    meal.categories.filter((c) => isDone(c.id)).length +
    added.filter((f) => isDone(addedCategoryId(f.id))).length;
  const chosen =
    meal.categories.filter((c) => choices?.[slotKey(meal.key, c.id)]).length + added.length;
  // What can be ticked is what was chosen: the meal counts as done once all of that is.
  const mealDone = chosen > 0 && done >= chosen;
  const tipCategoryId =
    qtyTip && editable
      ? meal.categories.find((c) => choices?.[slotKey(meal.key, c.id)])?.id
      : undefined;

  return (
    <Card style={styles.card} testID={`meal-${meal.key}`}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: accent.soft }]}>
          <Icon name={accent.icon} size={18} color={accent.tint} />
        </View>
        <View style={styles.headerText}>
          <Heading
            style={styles.mealName}
            accessible
            accessibilityLabel={`${meal.name}, ${meal.free ? 'pasto libero' : `${chosen} di ${total} scelte`}`}
            testID={`meal-title-${meal.key}`}
          >
            {meal.name}
          </Heading>
          <Muted>
            {meal.free && !added.length
              ? 'Pasto libero'
              : `${chosen} di ${total} ${total === 1 ? 'scelta' : 'scelte'}`}
          </Muted>
        </View>
        {total > 0 ? (
          <View style={styles.headerCount}>
            <Overline style={{ color: accent.tint }}>
              {done}/{total}
            </Overline>
          </View>
        ) : null}
        {onToggleMeal && !readOnly && chosen > 0 ? (
          <TipAnchor
            id="meal-check-all"
            order={5}
            text="Un tocco qui e tutto il pasto è segnato come mangiato. Toccalo di nuovo per annullare."
          >
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(
                  mealDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
                );
                onToggleMeal(meal, !mealDone);
              }}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mealDone }}
              accessibilityLabel={`${meal.name}: segna tutto il pasto come consumato`}
              testID={`eat-meal-${meal.key}`}
            >
              <CheckCircle checked={mealDone} tint={accent.tint} size={30} />
            </Pressable>
          </TipAnchor>
        ) : null}
      </View>

      {total > 0 ? (
        <ProgressBar value={total ? done / total : 0} tint={accent.tint} height={4} />
      ) : null}

      {meal.free && !added.length ? (
        <View style={styles.free}>
          <Icon name="happy-outline" size={18} color={colors.textMuted} />
          <Body style={styles.freeText}>
            Pasto libero: goditelo! Se ti serve un’idea, prendi spunto dagli altri giorni.
          </Body>
        </View>
      ) : null}

      <View style={styles.rows}>
        {meal.categories.map((category) => {
          const key = slotKey(meal.key, category.id);
          return (
            <CategoryRow
              key={category.id}
              meal={meal}
              category={category}
              chosenId={choices?.[key]}
              qtyOverride={extras?.overrides?.[key]}
              eaten={isDone(category.id)}
              tint={accent.tint}
              readOnly={readOnly}
              editable={editable}
              onPick={onPickCategory}
              onToggleEaten={onToggleEaten}
              onEditQty={onEditQty}
              qtyTip={category.id === tipCategoryId}
            />
          );
        })}
        {added.map((food) => (
          <AddedRow
            key={food.id}
            meal={meal}
            food={food}
            eaten={isDone(addedCategoryId(food.id))}
            tint={accent.tint}
            readOnly={readOnly}
            editable={editable}
            onToggleEaten={onToggleEaten}
            onEditQty={onEditQty}
          />
        ))}
      </View>

      {editable && onAddFood ? (
        <Pressable
          onPress={() => onAddFood(meal)}
          style={({ pressed }) => [styles.add, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Aggiungi un alimento a ${meal.name}`}
          testID={`add-food-${meal.key}`}
        >
          <Icon name="add-circle-outline" size={19} color={accent.tint} />
          <Body style={[styles.addText, { color: accent.tint }]}>Aggiungi alimento</Body>
        </Pressable>
      ) : null}
    </Card>
  );
}

function MaybeTip({
  show,
  children,
  ...tip
}: {
  show?: boolean;
  id: string;
  order: number;
  text: string;
  children: ReactElement;
}) {
  return show ? <TipAnchor {...tip}>{children}</TipAnchor> : children;
}

function QtyPill({
  text,
  tint,
  edited,
  onPress,
  onLongPress,
  testID,
}: {
  text: string;
  tint: string;
  edited?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
}) {
  const pill = (
    <View
      style={[
        styles.qty,
        { backgroundColor: `${tint}14` },
        edited && { borderColor: tint, borderWidth: 1 },
      ]}
    >
      {onPress ? <Icon name="pencil" size={10} color={tint} /> : null}
      <Body style={[styles.qtyText, { color: tint }]} numberOfLines={1}>
        {text}
      </Body>
    </View>
  );
  if (!onPress) return pill;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Cambia quantità: ${text}`}
      testID={testID}
    >
      {pill}
    </Pressable>
  );
}

function CategoryRow({
  meal,
  category,
  chosenId,
  qtyOverride,
  eaten,
  tint,
  readOnly,
  editable,
  onPick,
  onToggleEaten,
  onEditQty,
  qtyTip,
}: {
  meal: ResolvedMeal;
  category: FoodCategory;
  chosenId: string | undefined;
  qtyOverride: string | undefined;
  eaten: boolean;
  tint: string;
  readOnly?: boolean;
  editable?: boolean;
  onPick: (meal: ResolvedMeal, category: FoodCategory) => void;
  onToggleEaten?: (meal: ResolvedMeal, categoryId: string) => void;
  onEditQty?: (meal: ResolvedMeal, target: QtyTarget) => void;
  qtyTip?: boolean;
}) {
  const option = chosenId ? category.options.find((o) => o.id === chosenId) : undefined;
  const qty = qtyOverride ?? option?.qty.raw;

  return (
    <View style={styles.row} testID={`slot-${meal.key}-${category.id}`}>
      {!readOnly ? (
        <Pressable
          onPress={() => {
            if (!option) return;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleEaten?.(meal, category.id);
          }}
          disabled={!option}
          hitSlop={8}
          style={styles.checkHit}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: eaten, disabled: !option }}
          accessibilityLabel={`${category.name}: segna come consumato`}
          testID={`eat-${meal.key}-${category.id}`}
        >
          <CheckCircle checked={eaten} tint={tint} size={24} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => onPick(meal, category)}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${category.name}: ${option ? option.name : 'scegli un alimento'}`}
        testID={`pick-${meal.key}-${category.id}`}
      >
        <View style={styles.rowText}>
          <Overline numberOfLines={1}>{category.name}</Overline>
          {option ? (
            <>
              <Body
                style={[styles.optionName, eaten && styles.optionEaten]}
                numberOfLines={3}
                accessible
                accessibilityLabel={`${option.name}, ${qty}`}
                testID={`chosen-${meal.key}-${category.id}`}
              >
                {option.name}
              </Body>
              {option.components?.length ? (
                <Muted style={styles.components} numberOfLines={2}>
                  {option.components.map((c) => `${c.name} ${c.qty.raw}`).join(' · ')}
                </Muted>
              ) : null}
            </>
          ) : (
            <Body style={styles.placeholder} numberOfLines={1}>
              Scegli tra {category.options.length}{' '}
              {category.options.length === 1 ? 'alimento' : 'alternative'}
            </Body>
          )}
        </View>

        <View style={styles.rowEnd}>
          {option && qty ? (
            <MaybeTip
              show={qtyTip}
              id="oggi-qty"
              order={4}
              text="Tocca la grammatura per cambiarla solo per oggi. Il piano resta com’è."
            >
              <QtyPill
                text={qty}
                tint={tint}
                edited={qtyOverride !== undefined && qtyOverride !== option.qty.raw}
                onPress={editable && onEditQty ? () => onEditQty(meal, { category }) : undefined}
                testID={`qty-${meal.key}-${category.id}`}
              />
            </MaybeTip>
          ) : null}
          <Icon name="chevron-forward" size={16} color={colors.textFaint} />
        </View>
      </Pressable>
    </View>
  );
}

function AddedRow({
  meal,
  food,
  eaten,
  tint,
  readOnly,
  editable,
  onToggleEaten,
  onEditQty,
}: {
  meal: ResolvedMeal;
  food: AddedFood;
  eaten: boolean;
  tint: string;
  readOnly?: boolean;
  editable?: boolean;
  onToggleEaten?: (meal: ResolvedMeal, categoryId: string) => void;
  onEditQty?: (meal: ResolvedMeal, target: QtyTarget) => void;
}) {
  return (
    <View style={styles.row} testID={`added-${meal.key}-${food.id}`}>
      {!readOnly ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleEaten?.(meal, addedCategoryId(food.id));
          }}
          hitSlop={8}
          style={styles.checkHit}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: eaten }}
          accessibilityLabel={`${food.name}: segna come consumato`}
        >
          <CheckCircle checked={eaten} tint={tint} size={24} />
        </Pressable>
      ) : null}
      <View style={styles.rowBody}>
        <View style={styles.rowText}>
          <View style={styles.addedLabel}>
            <Icon name="sparkles" size={10} color={colors.terracotta} />
            <Overline style={{ color: colors.terracotta }} numberOfLines={1}>
              Aggiunto da te
            </Overline>
          </View>
          <Body style={[styles.optionName, eaten && styles.optionEaten]} numberOfLines={2}>
            {food.name}
          </Body>
          {food.brand ? (
            <Muted style={styles.components} numberOfLines={1}>
              {food.brand}
            </Muted>
          ) : null}
        </View>
        <View style={styles.rowEnd}>
          <QtyPill
            text={food.qty}
            tint={tint}
            onPress={editable && onEditQty ? () => onEditQty(meal, { food }) : undefined}
            testID={`qty-added-${food.id}`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  mealName: { fontSize: 16 },
  headerCount: { alignItems: 'flex-end' },
  rows: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkHit: { paddingVertical: spacing.sm },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowText: { flex: 1, gap: 1 },
  optionName: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  optionEaten: { color: colors.textMuted, textDecorationLine: 'line-through' },
  components: { fontSize: 12, marginTop: 1 },
  placeholder: { color: colors.textFaint, fontSize: 14, fontStyle: 'italic' },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  qtyText: { fontFamily: fonts.bodySemi, fontSize: 12.5 },
  addedLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  addText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  free: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  freeText: { flex: 1, fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
});
