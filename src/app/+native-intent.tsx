/**
 * Files opened with NutriMy from another app arrive as a link to the file
 * (content:// on Android, file:// on iOS). They aren't screens of the app: send
 * them to the import screen, which reads the file itself (see useIncomingPdf).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.startsWith('content://') || path.startsWith('file://')) return '/importa';
    return path;
  } catch {
    return '/';
  }
}
