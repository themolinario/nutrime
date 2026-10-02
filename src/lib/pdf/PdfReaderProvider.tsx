import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { PdfPage } from './types';

/**
 * Extracts positioned text from PDFs using a hidden WebView.
 *
 * pdf.js needs browser APIs that Hermes does not provide, so it runs inside a
 * WebView instead. The page is a single offline asset — no network, no worker
 * file — and it is loaded as an HTML string so neither platform needs file://
 * read permissions.
 */
type PdfReader = {
  ready: boolean;
  extract: (base64: string) => Promise<PdfPage[]>;
};

const PdfReaderContext = createContext<PdfReader | null>(null);

type Pending = {
  base64: string;
  resolve: (pages: PdfPage[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  /** Handed to the current reader: false while it is (re)loading. */
  sent: boolean;
  /** The reader already died once on this PDF. */
  retried: boolean;
};

/**
 * Time allowed without any news from the reader. The reader reports every page,
 * so a long PDF on a slow phone keeps going as long as it makes progress; only a
 * reader that is stuck runs out of time.
 */
const IDLE_TIMEOUT = 45_000;
/**
 * A live reader answers within moments of receiving a PDF. Silence means Android
 * dropped it, typically while the app sat behind the file picker: reload it.
 */
const ACK_TIMEOUT = 8_000;

export function PdfReaderProvider({ children }: { children: React.ReactNode }) {
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Bumped to remount the WebView after its process died.
  const [generation, setGeneration] = useState(0);
  const webviewRef = useRef<WebView>(null);
  const pending = useRef<Pending | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(require('../../../assets/pdfjs/reader.html'));
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const source = await new File(uri).text();
        if (!cancelled) setHtml(source);
      } catch (error) {
        console.warn('NutriMy: impossibile caricare il lettore PDF', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pending.current) clearTimeout(pending.current.timer);
    };
  }, []);

  // Read synchronously by the message handlers, unlike `ready`.
  const readyRef = useRef(false);

  /** Throws the reader away and loads a fresh one; a pending PDF is sent again once it's ready. */
  const restartReader = useCallback(() => {
    readyRef.current = false;
    setReady(false);
    const current = pending.current;
    if (current) {
      if (current.retried) {
        clearTimeout(current.timer);
        pending.current = null;
        current.reject(
          new Error('Il PDF è troppo pesante per questo telefono. Chiudi qualche app e riprova.'),
        );
      } else {
        current.retried = true;
        current.sent = false;
      }
    }
    setGeneration((g) => g + 1);
  }, []);

  const arm = useCallback(
    (current: Pending, ms: number) => {
      const giveUp = () => {
        if (pending.current !== current) return;
        pending.current = null;
        current.reject(new Error('Lettura del PDF troppo lunga.'));
      };
      clearTimeout(current.timer);
      current.timer = setTimeout(() => {
        if (pending.current !== current) return;
        if (ms !== ACK_TIMEOUT) return giveUp();
        // No sign of life after sending: the reader is gone, not slow.
        restartReader();
        if (pending.current === current) current.timer = setTimeout(giveUp, IDLE_TIMEOUT);
      }, ms);
    },
    [restartReader],
  );

  /** Hands the pending PDF to the reader, if both are there. */
  const flush = useCallback(() => {
    const current = pending.current;
    if (!current || current.sent || !readyRef.current || !webviewRef.current) return;
    current.sent = true;
    // JSON.stringify keeps the base64 payload safely quoted for injection.
    webviewRef.current.injectJavaScript(`window.__run(${JSON.stringify(current.base64)}); true;`);
    arm(current, ACK_TIMEOUT);
  }, [arm]);

  const settle = useCallback((apply: (p: Pending) => void) => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    apply(current);
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: { ready?: boolean; pages?: PdfPage[]; error?: string; progress?: number };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        settle((p) => p.reject(new Error('Risposta non leggibile dal lettore PDF.')));
        return;
      }

      if (payload.ready) {
        readyRef.current = true;
        setReady(true);
        flush();
        return;
      }
      if (payload.progress !== undefined) {
        if (pending.current) arm(pending.current, IDLE_TIMEOUT);
        return;
      }
      if (payload.error) {
        settle((p) => p.reject(new Error(payload.error)));
        return;
      }
      if (payload.pages) {
        settle((p) => p.resolve(payload.pages as PdfPage[]));
      }
    },
    [settle, flush, arm],
  );

  /**
   * Reads a PDF. If the reader is still loading (or reloading after Android
   * dropped it) the PDF waits for it instead of getting lost.
   */
  const extract = useCallback(
    (base64: string) =>
      new Promise<PdfPage[]>((resolve, reject) => {
        if (pending.current) {
          reject(new Error('Un altro PDF è già in lettura.'));
          return;
        }
        const current: Pending = {
          base64,
          resolve,
          reject,
          timer: setTimeout(() => {}, 0),
          sent: false,
          retried: false,
        };
        pending.current = current;
        arm(current, IDLE_TIMEOUT);
        flush();
      }),
    [arm, flush],
  );

  const value = useMemo<PdfReader>(() => ({ ready, extract }), [ready, extract]);

  return (
    <PdfReaderContext.Provider value={value}>
      {children}
      {html ? (
        <View style={styles.hidden} pointerEvents="none">
          <WebView
            key={generation}
            ref={webviewRef}
            source={{ html }}
            originWhitelist={['*']}
            onMessage={onMessage}
            javaScriptEnabled
            // The reader is fully offline; nothing should ever be fetched.
            cacheEnabled={false}
            androidLayerType="software"
            onError={() => setReady(false)}
            onRenderProcessGone={restartReader}
            onContentProcessDidTerminate={restartReader}
            testID="pdf-reader-webview"
          />
        </View>
      ) : null}
    </PdfReaderContext.Provider>
  );
}

export function usePdfReader(): PdfReader {
  const context = useContext(PdfReaderContext);
  if (!context) throw new Error('usePdfReader deve stare dentro PdfReaderProvider');
  return context;
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -10,
    left: -10,
  },
});
