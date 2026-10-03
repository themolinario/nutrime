Usa Claude in Chrome per preparare la release 1.5.0 di NutriMy nella Google Play Console, nello
stesso **test chiuso** già esistente (stessi tester, stessa traccia: non crearne una nuova).
Sono già loggato in Chrome; l'app «NutriMy» (`com.marcomolinari.nutrime`) ha già la 1.4.0
(versionCode 5) in test.

Prima di iniziare leggi la skill del browser (anthropic-skills:chrome-browser), poi leggi
`store/PLAY.md`: contiene TUTTI i testi. Non inventare nulla che non sia lì; se un campo della
Console non è coperto, chiedimelo.

File da caricare (sono sul mio Mac, nel progetto):
- app bundle: `NutriMy-1.5.0.aab` (nella cartella principale del progetto; versione 1.5.0,
  versionCode 6)
- screenshot telefono aggiornato: `store/play/phone/02.png` (la nuova schermata della serra)

Lavora in una scheda nuova su https://play.google.com/console, app «NutriMy». Fai, nell'ordine:

1. **Test › Test chiuso**: apri la traccia di test chiuso esistente (quella con i tester già
   invitati) e premi **Crea nuova release**.
   - Carica `NutriMy-1.5.0.aab`. Aspetta che finisca l'elaborazione e controlla che risulti
     versione **1.5.0 (6)**. Se la Console segnala errori o avvisi bloccanti, fermati e
     riportameli testualmente.
   - Nome della release: `1.5.0 (6)`.
   - Note di rilascio: copia il blocco `<it-IT> … </it-IT>` sotto «Versione 1.5.0:» nella
     sezione 6 di PLAY.md, tag compresi.
   - Premi **Avanti** fino alla pagina di riepilogo e fammi l'elenco di eventuali avvisi.
     **Non** premere «Salva e pubblica» / «Avvia il rollout»: fermati lì e chiedimelo.
2. **Crescita › Presenza nello Store › Scheda dello Store principale** (italiano):
   - Descrizione completa: sostituiscila con quella della sezione 1 di PLAY.md (è cambiato il
     paragrafo «LA TUA SERRA CRESCE CON TE»). Controlla che il testo incollato sia identico.
   - Screenshot del telefono: sostituisci **solo il secondo** con `store/play/phone/02.png`,
     lasciando gli altri sei e il loro ordine invariati.
   - Salva. Se la scheda va in revisione separata, dimmelo, ma non inviarla.
3. Apri **Panoramica della pubblicazione** e dimmi cosa risulta in attesa di invio (release
   del test chiuso e modifiche alla scheda dello Store).

Regole:
- Se il caricamento di un file dal Mac non riesce con gli strumenti del browser, non insistere:
  fermati e dimmi quale file trascinare io e dove.
- NON premere «Invia per la revisione», «Pubblica», «Avvia il rollout», «Invia modifiche» né
  niente che pubblichi o mandi a Google senza chiedermelo prima.
- NON toccare tester, liste email, paesi, test interno, produzione, pagamenti, utenti e
  autorizzazioni.
- Se una pagina della Console è diversa da come la descrivo, segui quello che vedi e dimmelo.
- Dopo ogni passo scrivimi una riga su cosa hai fatto.
