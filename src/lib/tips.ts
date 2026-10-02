import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';

import { track } from './analytics';
import { useDietStore } from './store/useDietStore';

export type TipRect = { x: number; y: number; width: number; height: number };

export type TipEntry = {
  id: string;
  text: string;
  /** Lower comes first among the tips of the same screen. */
  order: number;
  /** Where the anchor is on screen right now, or null when it is not laid out. */
  measure: () => Promise<TipRect | null>;
};

type ShownTip = { id: string; text: string; rect: TipRect; replay: boolean };

/** The tooltip on screen, read by `TipHost`. */
export const useTipStore = create<{ current: ShownTip | null }>(() => ({ current: null }));

/** Pause before the first tip of a screen and between one tip and the next. */
const FIRST_DELAY = 700;
const NEXT_DELAY = 350;

let queue: TipEntry[] = [];
/** Entries whose screen is focused; a tip is shown only while it is here. */
const active = new Set<TipEntry>();
let timer: ReturnType<typeof setTimeout> | undefined;

const isSeen = (id: string) => !!useDietStore.getState().seenTips[id];

function schedule(delay: number) {
  if (timer || useTipStore.getState().current) return;
  timer = setTimeout(() => {
    timer = undefined;
    void showNext();
  }, delay);
}

async function showNext() {
  while (queue.length && !useTipStore.getState().current) {
    const entry = queue.shift()!;
    if (isSeen(entry.id)) continue;
    const rect = await entry.measure();
    // A long press may have opened a tip meanwhile: this one waits its turn.
    if (useTipStore.getState().current) {
      if (active.has(entry)) queue.unshift(entry);
      return;
    }
    // Skip anchors that left their screen or are not laid out.
    if (!rect || !active.has(entry)) continue;
    present(entry, rect, false);
    return;
  }
}

function present(entry: Pick<TipEntry, 'id' | 'text'>, rect: TipRect, replay: boolean) {
  useTipStore.setState({ current: { id: entry.id, text: entry.text, rect, replay } });
  AccessibilityInfo.announceForAccessibility(entry.text);
}

/**
 * Queues a tip for its first appearance. Returns the undo, to call when the
 * screen loses focus: the tip then waits for the next visit.
 */
export function registerTip(entry: TipEntry): () => void {
  if (isSeen(entry.id) || queue.some((e) => e.id === entry.id)) return () => {};
  queue.push(entry);
  queue.sort((a, b) => a.order - b.order);
  active.add(entry);
  schedule(FIRST_DELAY);
  return () => {
    active.delete(entry);
    queue = queue.filter((e) => e !== entry);
    if (useTipStore.getState().current?.id === entry.id) useTipStore.setState({ current: null });
  };
}

/** Shows a tip again on demand (long press), whether seen or not. */
export async function showTipNow(entry: Pick<TipEntry, 'id' | 'text' | 'measure'>) {
  const rect = await entry.measure();
  if (!rect) return;
  present(entry, rect, true);
  track('tip_replayed', { tip: entry.id });
}

/** Closes the tip on screen; the next one of the screen follows shortly. */
export function dismissTip() {
  const current = useTipStore.getState().current;
  if (!current) return;
  if (!current.replay) useDietStore.getState().markTipSeen(current.id);
  useTipStore.setState({ current: null });
  schedule(NEXT_DELAY);
}
