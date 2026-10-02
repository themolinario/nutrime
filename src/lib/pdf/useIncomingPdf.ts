import * as Linking from 'expo-linking';
import { useEffect } from 'react';

/** True for links that point at a diet file the app should import: PDF or Word. */
function isPdfUrl(url: string | null): url is string {
  if (!url) return false;
  const withoutQuery = url.split('?')[0].split('#')[0];
  return /\.(pdf|docx?)$/i.test(decodeURIComponent(withoutQuery));
}

/**
 * Calls back with any PDF handed to the app from outside — the Files app, a
 * share sheet, AirDrop — both at cold start and while it is already running.
 */
export function useIncomingPdf(onPdf: (uri: string) => void) {
  useEffect(() => {
    let active = true;

    Linking.getInitialURL()
      .then((url) => {
        if (active && isPdfUrl(url)) onPdf(url);
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isPdfUrl(url)) onPdf(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [onPdf]);
}
