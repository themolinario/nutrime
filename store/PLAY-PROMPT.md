Usa Claude in Chrome per completare la configurazione di NutriMy nella Google Play Console.
Sono già loggato in Chrome; l'app esiste già e l'AAB 1.4.0 (versionCode 5) è caricato nel
test interno.

Prima di iniziare leggi la skill del browser (anthropic-skills:chrome-browser), poi leggi
`store/PLAY.md`: contiene TUTTI i testi e le risposte. Non inventare nulla che non sia lì; se
un campo della Console non è coperto, chiedimelo.

File da caricare (sono sul mio Mac, nel progetto):
- icona: `store/play/icon-512.png`
- grafica in evidenza: `store/play/feature-graphic.png`
- screenshot telefono, in quest'ordine: `store/play/phone/01.png` … `07.png`

Lavora in una scheda nuova su https://play.google.com/console, app «NutriMy»
(`com.marcomolinari.nutrime`). Fai, nell'ordine:

1. **Crescita › Presenza nello Store › Scheda dello Store principale** (italiano): nome,
   descrizione breve, descrizione completa, icona, grafica in evidenza, screenshot del
   telefono. Salva.
2. **Impostazioni dello Store**: categoria Salute e fitness, tag, email, sito web
   (sezione 1 di PLAY.md). Salva.
3. **Norme › Contenuti dell'app**, una dichiarazione alla volta, con le risposte della
   sezione 2 di PLAY.md: norme sulla privacy, accesso all'app, annunci, classificazione dei
   contenuti (questionario IARC), pubblico di destinazione, app per la salute, ID pubblicità,
   app di notizie/governative/finanziarie, sicurezza dei dati (con l'URL
   `https://nutrimy.themolinario.workers.dev/elimina-account`). Salva ognuna.
4. **Prezzo e distribuzione**: gratuita, solo Italia.
5. Alla fine, apri la **Dashboard** e fammi l'elenco di cosa risulta ancora da completare.

Regole:
- Se il caricamento di un file dal Mac non riesce con gli strumenti del browser, non insistere:
  fermati e dimmi quali file trascinare io e dove.
- NON premere «Invia per la revisione», «Pubblica», «Avvia il rollout» né niente che pubblichi
  o mandi a Google senza chiedermelo prima.
- NON invitare tester, non toccare pagamenti, account, utenti e autorizzazioni.
- Se una pagina della Console è diversa da come la descrivo, segui quello che vedi e dimmelo.
- Dopo ogni sezione scrivimi una riga su cosa hai salvato.
