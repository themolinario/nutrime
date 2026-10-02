import * as Linking from 'expo-linking';
import { useEffect } from 'react';

/**
 * True for links that point at a diet file the app should import: PDF or Word.
 * Android hands files over as `content://` URIs, which carry no extension: the
 * intent filter in app.json only lets PDF and Word through, so those all count.
 */
export function isDietFileUrl(url: string | null): url is string {
  if (!url) return false;
  if (url.startsWith('content://')) return true;
  const withoutQuery = url.split('?')[0].split('#')[0];
  return /\.(pdf|docx?)$/i.test(decodeURIComponent(withoutQuery));
}

/** Files already imported in this session, so reopening the import screen doesn't redo them. */
const handled = new Set<string>();
/** A file that arrived while the import screen wasn't open, waiting for it. */
let waiting: string | null = null;

/**
 * Calls back with any diet file handed to the app from outside — the Files app,
 * "Open with", a share sheet, AirDrop — both at cold start and while it runs.
 *
 * `consume` is for the screen that imports: it takes each file once. Without it
 * the hook only notices files (to navigate to that screen) and leaves them queued.
 */
export function useIncomingPdf(onPdf: (uri: string) => void, { consume = false } = {}) {
  useEffect(() => {
    let active = true;
    const deliver = (url: string) => {
      if (handled.has(url)) return;
      if (consume) {
        handled.add(url);
        waiting = null;
      } else {
        waiting = url;
      }
      onPdf(url);
    };

    const queued = waiting;
    if (queued) deliver(queued);
    else {
      Linking.getInitialURL()
        .then((url) => {
          if (active && isDietFileUrl(url)) deliver(url);
        })
        .catch(() => {});
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isDietFileUrl(url)) deliver(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [onPdf, consume]);
}
