# NutriMy — materiale per Google Play

Tutto quello che serve nella Play Console, pronto da incollare. Lingua predefinita:
**Italiano (it-IT)**. Package: `com.marcomolinari.nutrime`. Versione **1.5.0**.
I limiti di caratteri sono tra parentesi. Il materiale per Apple è in `README.md`.

---

## 1. Scheda dello Store principale

| Campo | Valore |
|---|---|
| Nome app (30) | `NutriMy` |
| Categoria | **Salute e fitness** |
| Tag (fino a 5) | Dieta · Nutrizione · Alimentazione · Liste della spesa · Pianificazione dei pasti |
| Email di contatto | `themolinario@gmail.com` |
| Sito web | `https://nutrimy.themolinario.workers.dev/` |
| Norme sulla privacy | `https://nutrimy.themolinario.workers.dev/privacy` |

### Descrizione breve (80)

```
Il PDF del nutrizionista diventa un menu da spuntare e la lista della spesa.
```

### Descrizione completa (4000)

```
Il tuo nutrizionista ti ha dato un PDF pieno di tabelle, alternative e grammature? NutriMy lo trasforma in un piano da seguire giorno per giorno, senza dover ricopiare nulla.

CARICHI IL PDF, AL RESTO PENSA NUTRIMY
Scegli il PDF (o il file Word) dai tuoi file, oppure condividilo con NutriMy da Gmail o WhatsApp. In pochi secondi l'app riconosce pasti, giorni, tabelle di alimenti e quantità. La lettura avviene sul telefono.

OGGI: IL MENU DA SPUNTARE
• Per ogni pasto scegli un alimento tra quelli previsti dalla dieta, con la grammatura giusta già indicata
• Spunta man mano che mangi, un alimento alla volta o tutto il pasto con un tocco
• «Compila per me» sceglie tutto in un tocco, alternando gli alimenti per variare
• Aggiungi un alimento fuori piano o modifica la quantità di un giorno

LA TUA SERRA CRESCE CON TE
Scegli una pianta e falla crescere con le giornate completate. Sono dieci, dal crescione pronto in 5 giorni all'ulivo che ne chiede 60: portale a termine per riempire la tua serra e sbloccare le più rare. Se salti un giorno la pianta si secca, ma la salvi completando il giorno dopo.

IL PESO, GIORNO PER GIORNO
Registra il peso in un tocco e guarda il grafico dell'andamento: ultimo mese, tre mesi, un anno o tutto. Tocca il grafico per leggere ogni pesata.

LA SETTIMANA A COLPO D'OCCHIO
• I prossimi 3, 7 o 14 giorni con quello che mangerai
• Pianifica tutto in un tocco e rigenera quando vuoi cambiare

LA LISTA DELLA SPESA SI SCRIVE DA SOLA
• Nasce dalle scelte dei giorni pianificati, con le quantità già sommate
• Divisa per reparto: frutta e verdura, carne, pesce, latticini, dispensa…
• Spunta quello che metti nel carrello e, se vuoi, nascondi quello che hai già preso
• Aggiungi a mano detersivi, caffè e tutto il resto

CONDIVIDI E STAMPA
Invia il menu di un giorno, della settimana o la lista della spesa su WhatsApp, oppure esportali in PDF da stampare.

PROMEMORIA
• Una notifica all'ora di ogni pasto, con il menu già scritto
• Un riepilogo serale se manca qualche spunta

LA TUA CRONOLOGIA
Il calendario delle giornate completate e la tua serie di giorni di fila. Resta anche quando carichi una nuova dieta, come le pesate.

PRIVATO PER SCELTA
Il PDF viene letto sul dispositivo e non viene inviato a nessuno. Nessun account obbligatorio: se vuoi, puoi creare un account gratuito (anche con Google) per salvare un backup online e ritrovare tutto su un nuovo telefono. Puoi eliminarlo in qualsiasi momento dall'app.

NutriMy non sostituisce il tuo nutrizionista e non dà consigli medici: ti aiuta a seguire il piano che ti ha preparato.

Oggi NutriMy legge i piani «a scelta multipla» in formato Progeo Medical e simili, e i piani settimanali in Word. Se il tuo file non viene letto bene, scrivici: aggiungiamo nuovi formati.
```

### Grafiche

| Elemento | File | Requisito |
|---|---|---|
| Icona | `store/play/icon-512.png` | 512 × 512 PNG |
| Grafica in evidenza | `store/play/feature-graphic.png` | 1024 × 500 |
| Screenshot telefono | `store/play/phone/0N.png` | 1:2, 1080 × 2160 (7) |
| Screenshot tablet 7" e 10" | `store/play/tablet/0N.png` | facoltativi |
| Video | link YouTube | `store/marketing/video/out/promo-iphone-audio.mp4` caricato su YouTube (anche «non in elenco») |

## 2. Contenuti dell'app (Norme › Contenuti dell'app)

**Norme sulla privacy**: `https://nutrimy.themolinario.workers.dev/privacy`

**Accesso all'app** → *Tutte le funzionalità sono disponibili senza limitazioni di accesso*
(il login è facoltativo e si salta). Nelle istruzioni facoltative:

```
Non serve un account: alla schermata di accesso tocca «Salta». Per provare l'app serve il PDF di una dieta: ne trovi uno di esempio (dati inventati) a questo link: https://nutrimy.themolinario.workers.dev/dieta-di-esempio.pdf. Aprilo sul telefono e condividilo con NutriMy, oppure in NutriMy tocca «Carica la dieta» e sceglilo dai file.
```

(Il PDF di esempio è `store/review/Dieta di esempio - NutriMy.pdf`, pubblicato sul sito come
`store/site/dieta-di-esempio.pdf`: dati tutti inventati, nessun dato reale.)

**Annunci** → No, l'app non contiene annunci.

**Classificazione dei contenuti** (questionario IARC) → categoria *Tutte le altre app*; a tutte le
domande su violenza, sesso, linguaggio, sostanze, gioco d'azzardo **No**; interazione tra utenti
**No**, condivisione della posizione **No**, acquisti digitali **No**. Risultato atteso: PEGI 3.

**Pubblico di destinazione** → **18 anni e più**. L'app non è progettata per i bambini.

**App per la salute** → seleziona *Nutrizione e gestione del peso* (e, se compare, *Monitoraggio
dell'attività/abitudini*). L'app non è un dispositivo medico e non fornisce diagnosi.

**App di notizie / governative / finanziarie / COVID-19** → No.

**ID pubblicità** → *No*, l'app non usa l'ID pubblicità (va verificato che il manifest della build non
contenga `com.google.android.gms.permission.AD_ID`: vedi sezione 4).

### Sicurezza dei dati

| Domanda | Risposta |
|---|---|
| L'app raccoglie o condivide dati utente? | **Sì** |
| I dati sono criptati in transito? | **Sì** (HTTPS) |
| Gli utenti possono chiedere l'eliminazione dei dati? | **Sì** |
| URL per l'eliminazione dell'account | `https://nutrimy.themolinario.workers.dev/elimina-account` |
| L'account si può creare dall'app? | **Sì**, facoltativo (email e password, Google) |

| Tipo di dato | Raccolto | Condiviso | Facoltativo | Scopo |
|---|---|---|---|---|
| Informazioni personali › **Indirizzo email** | Sì | No | Sì | Funzionalità dell'app, Gestione account |
| Informazioni personali › **ID utente** | Sì | No | Sì | Funzionalità dell'app, Gestione account |
| Salute e fitness › **Informazioni sulla salute** (piano alimentare, diario dei pasti, peso) | Sì | No | Sì | Funzionalità dell'app (backup) |
| Attività nelle app › **Interazioni con l'app** | Sì | No | Sì | Analisi (solo con consenso, non collegate all'account) |
| File e documenti | No: il PDF viene letto sul telefono e non viene inviato | | | |

- «Condiviso» = No: Supabase (backup e statistiche) è un fornitore di servizi che tratta i dati per
  nostro conto, e non conta come condivisione.
- La ricerca degli alimenti invia a Open Food Facts solo il testo cercato, senza identificativi.
- I dati raccolti per l'analisi non sono collegati all'identità dell'utente.

## 3. Prezzo e distribuzione

- Gratuita.
- Paesi: **Italia** (come su iOS).
- Dispositivi: telefoni e tablet.

## 4. Build e controlli tecnici

- Build: `NutriMy-1.5.0.aab`, fatta in locale con
  `JAVA_HOME=$(/usr/libexec/java_home -v 17) npx eas-cli build -p android --profile production --local`.
- Permessi: `app.json › android.blockedPermissions` toglie quelli che le librerie aggiungono ma
  l'app non usa (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`). Nessun `AD_ID`, nessuna
  sveglia esatta. Restano internet, notifiche, avvio al boot (per ripristinare i promemoria),
  vibrazione e i permessi dei badge sull'icona.
- Grafiche: `node store/marketing/play.mjs` (screenshot da `store/marketing/raw-android/`, presi
  dall'emulatore Pixel 8 con la barra di stato in modalità demo).
- Il **primo caricamento** va fatto a mano: *Test › Test interno › Crea nuova release*, trascina
  l'AAB, accetta la firma delle app di Google Play.
- **Accedi con Google**: dopo il primo caricamento, copia gli SHA-1 da *Integrità dell'app ›
  Firma delle app* (chiave di firma dell'app **e** chiave di caricamento) e aggiungili al client
  OAuth Android su Google Cloud. Senza, il login con Google non funziona nell'app scaricata dallo
  Store.

## 5. Pubblicazione

1. **Test interno** con il tuo account, per provare la build dallo Store.
2. **Test chiuso** con almeno **12 tester per 14 giorni di fila** (obbligatorio per gli account
   sviluppatore personali creati dopo novembre 2023).
3. **Richiedi l'accesso alla produzione** dalla Dashboard e rispondi al questionario sul test.
4. **Produzione**: la prima revisione richiede di solito da qualche giorno a una settimana.

## 6. Note di rilascio (500)

Versione 1.5.0:

```
<it-IT>
Novità: la tua serra. Scegli una pianta tra dieci e falla crescere con le giornate completate, dal crescione in 5 giorni all'ulivo in 60. Portale a termine per riempire la serra e sbloccare le più rare. Ogni pianta ha il suo aspetto e una festa tutta sua. Finestre e conferme ridisegnate nello stile di NutriMy.
</it-IT>
```

Versione 1.4.0 (prima versione):

```
<it-IT>
Prima versione di NutriMy su Android: carica il PDF del nutrizionista e ritrovi ogni giorno il menu da spuntare, la lista della spesa già pronta, la tua pianta che cresce giornata dopo giornata e il grafico del peso.
</it-IT>
```
