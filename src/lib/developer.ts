import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';

import { DEVELOPER, DEVELOPER_PROMO_EVERY, FEATURES } from '../config/app';
import { useDietStore } from './store/useDietStore';

export type ContactTopic = 'change' | 'idea' | 'project';

const SUBJECTS: Record<ContactTopic, string> = {
  change: 'NutriMy · Richiesta di modifica',
  idea: 'NutriMy · Un’idea da implementare',
  project: 'Nuovo progetto su commissione',
};

const OPENERS: Record<ContactTopic, string> = {
  change: 'Ciao Marco, vorrei questa modifica a NutriMy:\n\n',
  idea: 'Ciao Marco, ho un’idea per NutriMy:\n\n',
  project: 'Ciao Marco, vorrei parlarti di un progetto:\n\n• Di cosa si tratta:\n• Per quando:\n\n',
};

/** Opens the mail app with a pre-filled message, plus the app and OS version. */
export async function contactDeveloper(topic: ContactTopic) {
  const footer = `\n\n—\nNutriMy ${Application.nativeApplicationVersion ?? ''} (${
    Application.nativeBuildVersion ?? ''
  }) · ${Platform.OS} ${Platform.Version}`;
  const url = `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(SUBJECTS[topic])}&body=${encodeURIComponent(
    OPENERS[topic] + footer,
  )}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Nessuna app di posta', `Scrivi a ${DEVELOPER.email}`);
  }
}

/** Whether the developer section exists at all (local flag + remote switch). */
export function useDeveloperPromoEnabled(): boolean {
  const remote = useDietStore((s) => s.promoRemote);
  return FEATURES.developerPromo && remote !== false;
}

/** Whether this launch is one of the every-Nth that shows the banner. */
export function useDeveloperBannerDue(): boolean {
  const enabled = useDeveloperPromoEnabled();
  const launches = useDietStore((s) => s.launchCount);
  return enabled && launches > 0 && launches % DEVELOPER_PROMO_EVERY === 0;
}
