import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { todayISO } from './dates';

let current = todayISO();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let appState: { remove: () => void } | undefined;

/** Re-reads the calendar day and tells the subscribers if it moved on. */
function check() {
  const next = todayISO();
  if (next !== current) {
    current = next;
    listeners.forEach((listener) => listener());
  }
  armMidnight();
}

/**
 * Wakes up just after the next local midnight. Timers do not tick while the app
 * sleeps in the background, so coming back to the foreground checks too.
 */
function armMidnight() {
  clearTimeout(timer);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  timer = setTimeout(check, midnight.getTime() - now.getTime() + 1000);
}

/** Calls `listener` whenever the calendar day changes while the app is alive. */
export function subscribeToday(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    check();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      appState?.remove();
    }
  };
}

function getToday() {
  return current;
}

/** Today's local date as `YYYY-MM-DD`, re-rendering at midnight and on resume. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, getToday);
}
