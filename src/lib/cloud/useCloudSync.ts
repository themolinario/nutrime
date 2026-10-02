import { useEffect } from 'react';
import { AppState } from 'react-native';

import { FEATURES } from '../../config/app';
import { backupOf, useDietStore } from '../store/useDietStore';
import { uploadBackup } from './backup';
import { useSession } from './session';
import { supabase } from './supabase';

let uploading: Promise<void> | null = null;
let again = false;

function requestUpload() {
  if (!useSession.getState().session) return;
  if (uploading) {
    again = true;
    return;
  }
  uploading = uploadBackup()
    .catch((error) => console.warn('NutriMy: backup non riuscito', error))
    .finally(() => {
      uploading = null;
      if (again) {
        again = false;
        requestUpload();
      }
    });
}

/**
 * While signed in, every change to the user's data is saved to the cloud a few
 * seconds later, and at once when the app goes to the background. Also counts
 * the launch and reads the remote switches.
 */
export function useCloudSync() {
  useEffect(() => {
    const onHydrated = () => {
      useDietStore.getState().registerLaunch();
      if (FEATURES.developerPromo) {
        void supabase
          .from('app_config')
          .select('value')
          .eq('key', 'developer_promo')
          .maybeSingle()
          .then(({ data }) => {
            if (data) useDietStore.getState().setPromoRemote(data.value !== false);
          });
      }
    };
    const unsubHydrate = useDietStore.persist.hasHydrated()
      ? (onHydrated(), () => {})
      : useDietStore.persist.onFinishHydration(onHydrated);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useDietStore.subscribe((state, prev) => {
      const now = backupOf(state);
      const before = backupOf(prev);
      const changed = (Object.keys(now) as (keyof typeof now)[]).some((k) => now[k] !== before[k]);
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(requestUpload, 4000);
    });

    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'background' && timer) {
        clearTimeout(timer);
        timer = undefined;
        requestUpload();
      }
    });

    return () => {
      clearTimeout(timer);
      unsubHydrate();
      unsubStore();
      appState.remove();
    };
  }, []);
}
