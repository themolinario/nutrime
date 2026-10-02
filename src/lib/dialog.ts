import { create } from 'zustand';

import type { IconName } from '../components/Icon';

/**
 * NutriMy's own dialogs, in place of the system alert: same call shape as
 * `Alert.alert`, drawn by `DialogHost` in the app's style.
 */

export type DialogButton = {
  text: string;
  /** `cancel` closes quietly, `destructive` is drawn in red; the last other one is the main action. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type DialogOptions = {
  /** A tap outside or the back button cancels it; on by default. */
  cancelable?: boolean;
  icon?: IconName;
};

export type Dialog = {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  options: DialogOptions;
};

/** The dialogs waiting, the first one on screen. */
export const useDialogStore = create<{ queue: Dialog[] }>(() => ({ queue: [] }));

let nextId = 1;

export function showDialog(
  title: string,
  message?: string,
  buttons: DialogButton[] = [{ text: 'OK' }],
  options: DialogOptions = {},
) {
  const dialog = { id: nextId++, title, message, buttons, options };
  useDialogStore.setState((s) => ({ queue: [...s.queue, dialog] }));
}

/** Closes the dialog on screen, then runs what the button does. */
export function closeDialog(id: number, button?: DialogButton) {
  useDialogStore.setState((s) => ({ queue: s.queue.filter((d) => d.id !== id) }));
  button?.onPress?.();
}
