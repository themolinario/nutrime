import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayWidgetProps } from '../lib/widget/types';

/**
 * Medium home screen widget: the meal in progress with a tick button per food.
 *
 * The body runs in the widget extension's own JS runtime, serialised on its own —
 * it cannot see anything declared outside this function, so every helper lives
 * inside it. A button's return value is merged into the props and persisted by the
 * runtime, which is how a tick survives without the app running; the app then
 * absorbs `pending` the next time it syncs.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const green = '#1F6B4A';
  const paper = '#FBF6EE';
  const muted = '#6E7C72';

  const now = environment.date ?? new Date();
  const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
  const items = props.date === today ? props.items : [];
  const total = items.length;
  const done = items.filter((item) => item.done).length;

  // The meal in progress is the first one with something still to eat.
  const open = items.find((item) => !item.done);
  const mealItems = open ? items.filter((item) => item.mealKey === open.mealKey) : [];
  const rows = mealItems.filter((item) => !item.done).slice(0, 3);
  const hidden = mealItems.filter((item) => !item.done).length - rows.length;
  const mealDone = mealItems.filter((item) => item.done).length;

  const tick = (mealKey: string, categoryId: string) => () => ({
    items: items.map((item) =>
      item.mealKey === mealKey && item.categoryId === categoryId ? { ...item, done: true } : item,
    ),
    pending: [...props.pending, { date: props.date, mealKey, categoryId, done: true }],
  });

  const frame = [containerBackground(paper, 'widget'), widgetURL('nutrime://oggi')];

  if (total === 0 || !open) {
    return (
      <HStack spacing={12} modifiers={frame}>
        <Image systemName={total ? 'checkmark.seal.fill' : 'leaf.fill'} size={34} color={green} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle('#1B241E')]}>
            {total ? 'Giornata completata 🎉' : 'Nessun menu per oggi'}
          </Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(2)]}>
            {total ? `${done} di ${total} alimenti spuntati` : 'Apri NutriMy e scegli cosa mangiare.'}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={frame}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(green)]}>
          {`${open.meal.toUpperCase()} · ${mealDone}/${mealItems.length}`}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
          {hidden > 0 ? `+${hidden} ${hidden === 1 ? 'altro' : 'altri'} · oggi ${done}/${total}` : `oggi ${done}/${total}`}
        </Text>
      </HStack>
      {rows.map((item) => (
        <HStack key={`${item.mealKey}/${item.categoryId}`} spacing={10}>
          <Button target={`tick:${item.mealKey}/${item.categoryId}`} onPress={tick(item.mealKey, item.categoryId)}>
            <Image systemName="circle" size={22} color={green} />
          </Button>
          <Text modifiers={[font({ size: 15, weight: 'medium' }), foregroundStyle('#1B241E'), lineLimit(1)]}>
            {item.name}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(green)]}>{item.qty}</Text>
        </HStack>
      ))}
      <Spacer />
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget);
