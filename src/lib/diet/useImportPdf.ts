import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';

import { track } from '../analytics';
import { base64ToBytes, isLegacyWord, isZip, readDocx } from '../docx/readDocx';
import { usePdfReader } from '../pdf/PdfReaderProvider';
import { useDietStore } from '../store/useDietStore';
import { parseDietPages } from './parse';
import { looksLikeDocxPlan, parseDocxPlan } from './parseDocx';
import type { DietPlan } from './types';

export type ImportStage = 'idle' | 'reading' | 'parsing' | 'error';

const NO_MEALS =
  'Non sono riuscito a riconoscere le tabelle dei pasti in questo PDF. ' +
  'Serve un piano con le tabelle degli alimenti e le relative quantità.';

const NO_MEALS_WORD =
  'Non ho trovato le tabelle dei pasti in questo documento Word. Servono tabelle con i pasti ' +
  '(Colazione, Pranzo, Cena…) e i giorni della settimana.';

const OLD_WORD =
  'Questo è un file Word nel vecchio formato .doc. Aprilo in Word o Pages e salvalo come ' +
  '.docx o come PDF, poi riprova.';

/** Word documents are read directly, without the PDF engine. */
function importWord(bytes: Uint8Array, name: string): DietPlan | string {
  if (isLegacyWord(bytes)) return OLD_WORD;
  const blocks = readDocx(bytes);
  if (!looksLikeDocxPlan(blocks)) return NO_MEALS_WORD;
  const plan = parseDocxPlan(blocks, name);
  return plan.meals.length ? plan : NO_MEALS_WORD;
}

/**
 * Reads a diet PDF and stores the parsed plan.
 *
 * The same flow serves both the file picker and PDFs handed to the app from
 * outside, so an import behaves identically however it starts.
 */
export function useImportPdf(onDone?: (plan: DietPlan) => void) {
  const { extract, ready } = usePdfReader();
  const setPlan = useDietStore((s) => s.setPlan);

  const [stage, setStage] = useState<ImportStage>('idle');
  const [error, setError] = useState<string | null>(null);
  // Guards against a second import starting while one is in flight.
  const running = useRef(false);

  const runImport = useCallback(
    async (uri: string, name: string, base64FromPicker?: string) => {
      if (running.current) return;
      running.current = true;
      setError(null);
      setStage('reading');
      const started = Date.now();
      const source = base64FromPicker ? 'picker' : 'shared';

      try {
        const base64 = base64FromPicker ?? (await new File(uri).base64());
        const bytes = base64ToBytes(base64.slice(0, 64));

        if (isZip(bytes) || isLegacyWord(bytes)) {
          setStage('parsing');
          const result = importWord(base64ToBytes(base64), name);
          if (typeof result === 'string') {
            setStage('error');
            setError(result);
            track('plan_import_failed', { reason: 'word', source });
            return;
          }
          track('pdf_read', { pages: 0, ms: Date.now() - started, source, format: 'docx' });
          setPlan(result);
          setStage('idle');
          onDone?.(result);
          return;
        }

        const pages = await extract(base64);

        setStage('parsing');
        const plan = parseDietPages(pages, name);

        if (!plan.meals.length) {
          setStage('error');
          setError(NO_MEALS);
          track('plan_import_failed', { reason: 'no_meals', pages: pages.length, source });
          return;
        }
        track('pdf_read', { pages: pages.length, ms: Date.now() - started, source });

        setPlan(plan);
        setStage('idle');
        onDone?.(plan);
      } catch (e) {
        setStage('error');
        setError(e instanceof Error ? e.message : 'Qualcosa è andato storto durante la lettura.');
        track('plan_import_failed', { reason: 'error', source });
      } finally {
        running.current = false;
      }
    },
    [extract, setPlan, onDone],
  );

  const importFromUri = useCallback(
    (uri: string) => {
      // Android's content:// URIs end in an id, not a file name.
      const last = decodeURIComponent(uri.split('?')[0].split('/').pop() ?? '');
      const name = /\.(pdf|docx?)$/i.test(last) ? last : 'Piano alimentare.pdf';
      void runImport(uri, name);
    },
    [runImport],
  );

  const importFromPicker = useCallback(async () => {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      await runImport(asset.uri, asset.name ?? 'Piano alimentare.pdf', asset.base64);
    } catch (e) {
      setStage('error');
      setError(e instanceof Error ? e.message : 'Non sono riuscito ad aprire il file.');
    }
  }, [runImport]);

  return {
    ready,
    stage,
    error,
    busy: stage === 'reading' || stage === 'parsing',
    importFromUri,
    importFromPicker,
  };
}
