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
  resolve: (pages: PdfPage[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const EXTRACTION_TIMEOUT = 60_000;

export function PdfReaderProvider({ children }: { children: React.ReactNode }) {
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
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

  const settle = useCallback((apply: (p: Pending) => void) => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    apply(current);
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: { ready?: boolean; pages?: PdfPage[]; error?: string };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        settle((p) => p.reject(new Error('Risposta non leggibile dal lettore PDF.')));
        return;
      }

      if (payload.ready) {
        setReady(true);
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
    [settle],
  );

  const extract = useCallback(
    (base64: string) =>
      new Promise<PdfPage[]>((resolve, reject) => {
        if (!webviewRef.current) {
          reject(new Error('Lettore PDF non pronto. Riprova tra un istante.'));
          return;
        }
        if (pending.current) {
          reject(new Error('Un altro PDF è già in lettura.'));
          return;
        }

        const timer = setTimeout(() => {
          settle((p) => p.reject(new Error('Lettura del PDF troppo lunga.')));
        }, EXTRACTION_TIMEOUT);

        pending.current = { resolve, reject, timer };
        // JSON.stringify keeps the base64 payload safely quoted for injection.
        webviewRef.current.injectJavaScript(
          `window.__run(${JSON.stringify(base64)}); true;`,
        );
      }),
    [settle],
  );

  const value = useMemo<PdfReader>(() => ({ ready, extract }), [ready, extract]);

  return (
    <PdfReaderContext.Provider value={value}>
      {children}
      {html ? (
        <View style={styles.hidden} pointerEvents="none">
          <WebView
            ref={webviewRef}
            source={{ html }}
            originWhitelist={['*']}
            onMessage={onMessage}
            javaScriptEnabled
            // The reader is fully offline; nothing should ever be fetched.
            cacheEnabled={false}
            androidLayerType="software"
            onError={() => setReady(false)}
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
