import { useEffect } from 'react';
import { AppState } from 'react-native';

import { todayISO } from '../dates';
import { planningWindow, useDietStore } from '../store/useDietStore';
import { subscribeToday } from '../useToday';

function fillPlanningWindow() {
  const { horizon, fillSingleOptions } = useDietStore.getState();
  fillSingleOptions(planningWindow(horizon, todayISO()));
}

/**
 * Tables with a single food leave nothing to decide, so that food is picked
 * for every day being planned — at launch, when the plan or the window change,
 * and when the app comes back (possibly on a new day).
 */
export function useSingleOptionFill() {
  useEffect(() => {
    const unsubHydrate = useDietStore.persist.hasHydrated()
      ? (fillPlanningWindow(), () => {})
      : useDietStore.persist.onFinishHydration(fillPlanningWindow);
    const unsubStore = useDietStore.subscribe((state, prev) => {
      if (state.plan !== prev.plan || state.horizon !== prev.horizon) fillPlanningWindow();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') fillPlanningWindow();
    });
    // A new day adds one to the end of the window, even with the app left open.
    const unsubToday = subscribeToday(fillPlanningWindow);
    return () => {
      unsubHydrate();
      unsubStore();
      appState.remove();
      unsubToday();
    };
  }, []);
}
