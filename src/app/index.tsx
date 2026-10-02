import { Redirect } from 'expo-router';

import { useDietStore, useHydrated } from '../lib/store/useDietStore';

/**
 * First launch shows the introduction; after that, the import screen until a
 * plan exists. People who already had a plan before the introduction existed
 * skip it.
 */
export default function Entry() {
  const hydrated = useHydrated();
  const hasPlan = useDietStore((s) => s.plan !== null);
  const onboarded = useDietStore((s) => s.onboarded);
  const askStats = useDietStore((s) => s.analyticsConsent === null);
  if (!hydrated) return null;
  if (!onboarded && !hasPlan) return <Redirect href="/benvenuto" />;
  // People who installed before the statistics existed are asked once.
  if (askStats) return <Redirect href="/statistiche" />;
  return <Redirect href={hasPlan ? '/oggi' : '/importa'} />;
}
