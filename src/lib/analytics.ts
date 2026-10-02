import * as Application from 'expo-application';
import { AppState, Platform } from 'react-native';

import { supabase } from './cloud/supabase';
import { useDietStore } from './store/useDietStore';

/**
 * Anonymous usage statistics, only with the user's consent.
 *
 * Events carry a name and a few plain properties (counts, which meal, which
 * button) — never food names, plan contents or the account. They are kept in
 * memory and sent in batches to the `analytics_events` table; a phone that is
 * offline simply sends them later, or loses them if the app is closed.
 */

type Props = Record<string, string | number | boolean | null>;

type Row = {
  install_id: string;
  session_id: string;
  name: string;
  props: Props;
  platform: 'ios' | 'android';
  app_version: string;
  os_version: string;
  occurred_at: string;
};

const FLUSH_EVERY_MS = 20_000;
const FLUSH_AT = 25;
const MAX_QUEUE = 300;
/** Back after this long in the background counts as a new session. */
const SESSION_GAP_MS = 30 * 60_000;

let queue: Row[] = [];
let sessionId = uuid();
let backgroundSince: number | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let sending = false;

/** RFC 4122 v4 layout; randomness from Math.random is plenty for counting phones. */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function enabled(): string | null {
  const { analyticsConsent, installId } = useDietStore.getState();
  return analyticsConsent && installId ? installId : null;
}

/** Records one event, if the user agreed. Safe to call from anywhere. */
export function track(name: string, props: Props = {}) {
  const installId = enabled();
  if (!installId || Platform.OS === 'web') return;
  queue.push({
    install_id: installId,
    session_id: sessionId,
    name,
    props,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app_version: Application.nativeApplicationVersion ?? '0',
    os_version: String(Platform.Version),
    occurred_at: new Date().toISOString(),
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= FLUSH_AT) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), FLUSH_EVERY_MS);
}

async function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (sending || !queue.length) return;
  if (!enabled()) {
    queue = [];
    return;
  }
  sending = true;
  const batch = queue;
  queue = [];
  const { error } = await supabase.from('analytics_events').insert(batch);
  sending = false;
  // Keep them for the next try; newer events go after.
  if (error) queue = [...batch, ...queue].slice(-MAX_QUEUE);
}

/** Turns statistics on or off. Off drops whatever was not sent yet. */
export function setAnalyticsConsent(value: boolean) {
  const { installId, setAnalyticsConsent: save } = useDietStore.getState();
  save(value, value ? (installId ?? uuid()) : undefined);
  if (value) track('analytics_enabled');
  else queue = [];
}

// Send before the app goes to sleep; a long pause starts a new session.
AppState.addEventListener('change', (status) => {
  if (status === 'active') {
    if (backgroundSince !== null && Date.now() - backgroundSince > SESSION_GAP_MS) {
      sessionId = uuid();
      track('app_open', { resumed: true });
    }
    backgroundSince = null;
  } else if (status === 'background') {
    backgroundSince = Date.now();
    void flush();
  }
});
