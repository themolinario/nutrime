import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { track } from '../analytics';
import { todayISO } from '../dates';
import { extrasOf, useDietStore } from '../store/useDietStore';
import { buildHistory, historyStats, restDaysOf } from '../history';
import { buildReminders, type ReminderData } from './plan';

const CATEGORY = 'meal';
const ACTION_DONE = 'done';

// Reminders that fire while the app is open still show as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Asks for permission; returns whether reminders can be delivered. */
export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let scheduling: Promise<void> | null = null;
let again = false;

/**
 * Replaces every pending reminder with a fresh set built from the store. The
 * whole set is small (at most meals × 7 days), so rebuilding beats diffing.
 */
async function reschedule(): Promise<void> {
  const state = useDietStore.getState();
  const { plan, reminders, recapTime, choices, eaten, archive } = state;
  const extrasFor = (d: string) => extrasOf(state, d);
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!Object.keys(reminders).length && !recapTime) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  // The action opens the app: on iOS only a foreground launch reliably runs our JS.
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: ACTION_DONE,
      buttonTitle: 'Segna come fatto',
      options: { opensAppToForeground: true },
    },
  ]);

  const today = todayISO();
  const { streak } = historyStats(
    buildHistory(plan, choices, eaten, archive, today, extrasFor),
    today,
    restDaysOf(plan),
  );
  const requests = buildReminders(plan, reminders, choices, eaten, today, new Date(), {
    recapTime,
    streak,
    extrasFor,
  });
  for (const request of requests) {
    await Notifications.scheduleNotificationAsync({
      identifier: request.id,
      content: {
        title: request.title,
        body: request.body,
        data: request.data,
        // Only meal reminders offer "Segna come fatto"; the evening check-in just opens the day.
        ...(request.data.kind === 'meal' ? { categoryIdentifier: CATEGORY } : {}),
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.at },
    });
  }
}

export function requestReschedule() {
  if (scheduling) {
    again = true;
    return;
  }
  scheduling = reschedule()
    .catch((error) => console.warn('NutriMy: promemoria non programmati', error))
    .finally(() => {
      scheduling = null;
      if (again) {
        again = false;
        requestReschedule();
      }
    });
}

/** Keeps the scheduled reminders in step with the plan, the picks and the times. */
export function useReminderScheduling() {
  useEffect(() => {
    const unsubHydrate = useDietStore.persist.hasHydrated()
      ? (requestReschedule(), () => {})
      : useDietStore.persist.onFinishHydration(requestReschedule);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useDietStore.subscribe((state, prev) => {
      if (
        state.plan === prev.plan &&
        state.reminders === prev.reminders &&
        state.recapTime === prev.recapTime &&
        state.choices === prev.choices &&
        state.eaten === prev.eaten &&
        state.added === prev.added &&
        state.qtyOverrides === prev.qtyOverrides
      ) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(requestReschedule, 500);
    });
    // Coming back also drops reminders for meals ticked elsewhere (e.g. the widget).
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') requestReschedule();
    });

    return () => {
      clearTimeout(timer);
      unsubHydrate();
      unsubStore();
      appState.remove();
    };
  }, []);
}

const handled = new Set<string>();

function handleResponse(response: Notifications.NotificationResponse) {
  const request = response.notification.request;
  const key = `${request.identifier}/${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);

  const data = request.content.data as Partial<ReminderData> | undefined;
  if (!data?.date) return;
  track('notification_opened', {
    kind: data.kind ?? 'meal',
    action: response.actionIdentifier === ACTION_DONE ? 'done' : 'open',
  });

  if (response.actionIdentifier === ACTION_DONE && data.mealKey) {
    useDietStore.getState().markMealEaten(data.date, data.mealKey);
  }
  router.navigate(data.date === todayISO() ? '/oggi' : `/giorno/${data.date}`);
  Notifications.clearLastNotificationResponse();
}

/**
 * Acts on a tapped reminder — including the one that launched the app. Must be
 * mounted inside the navigator, after the store has loaded.
 */
export function useReminderResponses() {
  useEffect(() => {
    const whenReady = (fn: () => void) =>
      useDietStore.persist.hasHydrated()
        ? (fn(), () => {})
        : useDietStore.persist.onFinishHydration(fn);

    const unsubHydrate = whenReady(() => {
      const last = Notifications.getLastNotificationResponse();
      if (last) handleResponse(last);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      whenReady(() => handleResponse(response)),
    );
    return () => {
      unsubHydrate();
      subscription.remove();
    };
  }, []);
}
