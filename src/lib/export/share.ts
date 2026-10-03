import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { track } from '../analytics';
import { showDialog } from '../dialog';

export type ExportContent = {
  /** Title of the choice sheet, e.g. `Condividi il menu`. */
  title: string;
  /** Chat-ready text with WhatsApp markup. */
  message: () => string;
  /** Printable HTML for the PDF. */
  html: () => string;
  fileName: string;
  /** What is being shared, for the statistics. */
  kind: 'day' | 'range' | 'shopping';
};

async function sharePdf({ html, fileName, title }: ExportContent) {
  try {
    const { uri } = await Print.printToFileAsync({
      html: html(),
      // A4 at 72 PPI; margins only apply on iOS, Android reads the @page rule.
      width: 595,
      height: 842,
      margins: { top: 50, bottom: 50, left: 45, right: 45 },
    });
    // Give the file a readable name: it is what the recipient sees in the chat.
    const named = new File(Paths.cache, fileName);
    await new File(uri).move(named, { overwrite: true });
    await Sharing.shareAsync(named.uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: title,
    });
  } catch {
    showDialog(
      'Esportazione non riuscita',
      'Non sono riuscito a creare il PDF. Riprova tra un attimo.',
    );
  }
}

/** Asks whether to send the content as a chat message or as a PDF, then shares it. */
export function showExportMenu(content: ExportContent) {
  showDialog(content.title, undefined, [
    {
      text: 'Messaggio (WhatsApp)',
      onPress: () => {
        track('share', { what: content.kind, format: 'message' });
        void Share.share({ message: content.message() });
      },
    },
    {
      text: 'PDF',
      onPress: () => {
        track('share', { what: content.kind, format: 'pdf' });
        void sharePdf(content);
      },
    },
    { text: 'Annulla', style: 'cancel' },
  ]);
}
