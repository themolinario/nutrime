# NutriMy

Trasforma il PDF del nutrizionista in una checklist giorno per giorno e in una lista
della spesa. Niente account, niente server: il PDF viene letto sul dispositivo e i dati
non escono mai dal telefono.

App Expo (SDK 57) / React Native, in italiano.

## Cosa fa

- **Import del PDF** — riconosce i piani "a scelta multipla" (formato Progeo Medical e
  simili): pasti, gruppi di giorni, tabelle di alimenti con le grammature, piatti
  composti come le insalatone, pasti liberi.
- **Oggi** — la checklist del giorno: per ogni tabella si sceglie un alimento e lo si
  spunta quando è stato consumato.
- **Settimana** — i sette giorni successivi con le scelte fatte, e un "Compila tutto"
  che alterna gli alimenti per garantire varietà.
- **Spesa** — la lista costruita dalle scelte della finestra scelta (3 / 7 / 14 giorni),
  con le quantità sommate, raggruppata per reparto, più gli articoli aggiunti a mano.
- **Piano** — quello che è stato letto dal PDF, tabella per tabella.

## Come funziona la lettura del PDF

pdf.js ha bisogno di API del browser che Hermes non espone, quindi gira dentro una
WebView nascosta:

1. `scripts/build-pdfjs.mjs` compila pdf.js **e il suo worker** in un unico file e li
   inserisce in `assets/pdfjs/reader.html`. Il worker viene registrato su
   `globalThis.pdfjsWorker`, così pdf.js lo esegue sul thread principale: nessun file
   worker separato, nessuna richiesta di rete, nessun permesso `file://`.
2. `src/lib/pdf/PdfReaderProvider.tsx` carica quella pagina come stringa HTML e le passa
   il PDF in base64; riceve indietro i frammenti di testo con le loro coordinate.
3. `src/lib/diet/parse.ts` ricostruisce il piano da quelle coordinate — colonne,
   intestazioni di tabella, nomi andati a capo, quantità allineate a destra.

Il parser è codice puro: gira identico sul telefono e in Node, ed è per questo che si
può verificare senza simulatore (vedi sotto).

## Comandi

```bash
npm start                 # dev server (serve una dev build, non Expo Go)
npm run ios               # build + avvio su simulatore iOS
npm run typecheck         # TypeScript su app e script
npm run build:pdfjs       # rigenera assets/pdfjs/reader.html
npm run test:parser       # esegue il parser su un PDF già estratto e stampa il piano
npm run verify:pdfjs <pdf>  # confronta l'estrazione della WebView con quella di Node
npm run e2e               # suite Maestro sul simulatore (richiede una build Release)
npm run e2e:build         # come sopra, ricompilando prima l'app
```

### Verificare il parser senza simulatore

```bash
node scripts/extract.mjs "dieta.pdf" scripts/fixture-pages.json
npm run test:parser
```

Stampa paziente, pasti, tabelle e alimenti riconosciuti, più il riepilogo dei sette
giorni. È il modo più rapido per controllare se un nuovo formato di PDF viene letto bene.

`scripts/fixture-pages.json` non è versionato: contiene i dati di un piano reale, quindi
va rigenerato in locale con il comando qui sopra.

### Test end-to-end

`scripts/e2e.sh` installa l'app da zero sul simulatore, copia il PDF di prova nella sua
cartella Documenti (dove il selettore file di iOS lo trova) ed esegue i flow Maestro in
ordine: l'import costruisce il piano su cui lavorano tutti gli altri.

```bash
npm run e2e:build                      # prima esecuzione, compila la Release
npm run e2e                            # esecuzioni successive
scripts/e2e.sh --pdf /percorso/dieta.pdf
scripts/e2e.sh .maestro/05-spesa.yaml  # un solo flow
```

Il PDF di prova si indica con `--pdf` o con la variabile `NUTRIME_TEST_PDF`.

## Struttura

```
src/
  app/                     schermate (expo-router: tab Oggi / Settimana / Spesa / Piano)
  components/              UI condivisa e la card di un pasto
  lib/
    diet/parse.ts          da frammenti di testo posizionati a piano alimentare
    diet/shopping.ts       aggregazione della lista della spesa per reparto
    pdf/                   il ponte WebView verso pdf.js
    store/                 stato persistito (zustand + AsyncStorage)
  theme/                   colori, spaziature, tipografia
assets/pdfjs/reader.html   lettore PDF offline (generato, ~1,7 MB)
.maestro/                  flow end-to-end
```

## Note

- `assets/pdfjs/reader.html` è generato: si modifica `scripts/reader-template.html` e si
  rigenera con `npm run build:pdfjs`.
- `ios/` e `android/` sono generati da `expo prebuild` e non vanno modificati a mano: la
  configurazione nativa sta in `app.json`.
- NutriMy non sostituisce il parere del nutrizionista; l'elaborato originale resta il
  riferimento.
