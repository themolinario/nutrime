import { addUserInteractionListener } from 'expo-widgets';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import TodayWidget from '../../widgets/TodayWidget';
import { todayISO } from '../dates';
import { extrasOf, useDietStore } from '../store/useDietStore';
import { buildWidgetTimeline } from './timeline';

let running: Promise<void> | null = null;
let again = false;
let lastPushed = '';

/**
 * Two-way sync with the home screen widget: first absorb the ticks made on the
 * widget (its persisted props carry them as `pending`), then push the current
 * state back. Always in that order, so a push never overwrites an unread tick.
 */
async function sync(): Promise<void> {
  const entries = await TodayWidget.getTimeline().catch(() => []);

  const { setEaten } = useDietStore.getState();
  for (const entry of entries) {
    for (const toggle of entry.props?.pending ?? []) {
      setEaten(toggle.date, toggle.mealKey, toggle.categoryId, toggle.done);
    }
  }

  const state = useDietStore.getState();
  const { plan, choices, eaten } = state;
  const timeline = buildWidgetTimeline(plan, choices, eaten, todayISO(), new Date(), (d) =>
    extrasOf(state, d),
  );

  // Skip redundant reloads: WidgetKit budgets them.
  const signature = JSON.stringify(timeline.map((e) => e.props));
  const hadPending = entries.some((e) => e.props?.pending?.length);
  if (signature === lastPushed && !hadPending) return;
  lastPushed = signature;
  TodayWidget.updateTimeline(timeline);
}

/** Serialises syncs; a request that arrives mid-sync runs once more afterwards. */
function requestSync() {
  if (running) {
    again = true;
    return;
  }
  running = sync()
    .catch((error) => console.warn('NutriMy: sincronizzazione widget non riuscita', error))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        requestSync();
      }
    });
}

/** Keeps the home screen widget and the store in step for as long as the app runs. */
export function useWidgetSync() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const unsubHydrate = useDietStore.persist.hasHydrated()
      ? (requestSync(), () => {})
      : useDietStore.persist.onFinishHydration(requestSync);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useDietStore.subscribe((state, prev) => {
      if (
        state.plan === prev.plan &&
        state.choices === prev.choices &&
        state.eaten === prev.eaten &&
        state.added === prev.added &&
        state.qtyOverrides === prev.qtyOverrides
      ) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(requestSync, 300);
    });

    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') requestSync();
    });
    const interaction = addUserInteractionListener((event) => {
      if (event.source === 'TodayWidget') requestSync();
    });

    return () => {
      clearTimeout(timer);
      unsubHydrate();
      unsubStore();
      appState.remove();
      interaction.remove();
    };
  }, []);
}
