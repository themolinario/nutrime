import * as Application from 'expo-application';
import { Alert } from 'react-native';

import { backupOf, useDietStore, type BackupData } from '../store/useDietStore';
import { useSession } from './session';
import { supabase } from './supabase';

/** Bump when the shape of {@link BackupData} changes, and migrate on restore. */
const SCHEMA_VERSION = 1;

export type CloudBackup = { data: BackupData; updatedAt: Date };

/*
 * Slot keys join meal and table with U+0000, which Postgres `jsonb` refuses
 * ("unsupported Unicode escape sequence"). In the cloud copy it becomes U+241F
 * (SYMBOL FOR UNIT SEPARATOR), which never appears in a diet plan, and turns
 * back on the way down.
 */
const toCloud = (data: BackupData): BackupData =>
  JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '\\u241f'));
const fromCloud = (data: BackupData): BackupData =>
  JSON.parse(JSON.stringify(data).replace(/\u241f/g, '\\u0000'));

export async function fetchBackup(): Promise<CloudBackup | null> {
  const userId = useSession.getState().session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('backups')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { data: fromCloud(data.data as BackupData), updatedAt: new Date(data.updated_at) }
    : null;
}

/** Saves the current on-device data as the user's single cloud snapshot. */
export async function uploadBackup(): Promise<void> {
  const userId = useSession.getState().session?.user.id;
  if (!userId) return;
  const store = useDietStore.getState();
  const { error } = await supabase.from('backups').upsert({
    user_id: userId,
    data: toCloud(backupOf(store)),
    schema_version: SCHEMA_VERSION,
    app_version: Application.nativeApplicationVersion,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  store.setLastBackupAt(Date.now());
}

export function restoreBackup(backup: CloudBackup) {
  useDietStore.getState().restoreBackup(backup.data);
  useDietStore.getState().setLastBackupAt(backup.updatedAt.getTime());
}

function formatWhen(date: Date): string {
  return date.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Right after signing in: bring the phone and the cloud together. An empty phone
 * takes the cloud copy (the "reinstalled the app" case), an empty cloud takes the
 * phone's, and when both hold a plan the user picks which one wins.
 */
export async function reconcileAfterSignIn(): Promise<void> {
  const cloud = await fetchBackup();
  const localHasPlan = useDietStore.getState().plan !== null;

  if (!cloud?.data.plan) {
    if (localHasPlan) await uploadBackup();
    return;
  }
  if (!localHasPlan) {
    restoreBackup(cloud);
    return;
  }

  await new Promise<void>((resolve) => {
    Alert.alert(
      'Trovato un backup',
      `Nel cloud c’è un piano salvato il ${formatWhen(cloud.updatedAt)}. Quale vuoi tenere?`,
      [
        {
          text: 'Quello del cloud',
          onPress: () => {
            restoreBackup(cloud);
            resolve();
          },
        },
        {
          text: 'Quello del telefono',
          onPress: () => {
            uploadBackup().finally(resolve);
          },
        },
      ],
      { cancelable: false },
    );
  });
}
