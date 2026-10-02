# NutriMy — materiale per l'App Store

Tutto quello che serve in App Store Connect. Versione attuale: **1.5.0**.
Lingua principale: **Italiano**. I limiti di caratteri sono indicati tra parentesi.

---

## 1. Informazioni sull'app

| Campo | Valore |
|---|---|
| Nome (30) | `NutriMy` |
| Sottotitolo (30) | `Dieta e spesa senza pensieri` |
| Bundle ID | `com.marcomolinari.nutrime` |
| SKU | `nutrime-ios` |
| Categoria principale | **Salute e fitness** |
| Categoria secondaria | **Cibi e bevande** |
| Lingua principale | Italiano |
| Contenuti con diritti di terzi | No |
| Copyright | `2026 Marco Molinari` |

## 2. Prezzo e disponibilità

- Prezzo: **Gratis**
- Disponibilità: **solo Italia** per iniziare (l'app è solo in italiano e legge il formato
  PDF dei nutrizionisti italiani). Si può estendere in seguito.

## 3. Pagina della versione

### Testo promozionale (170) — modificabile senza nuova build

```
Carica il PDF del nutrizionista e ritrovi ogni giorno il tuo menu, pronto da spuntare. La lista della spesa si scrive da sola, con le quantità già sommate.
```

### Descrizione (4000)

```
Il tuo nutrizionista ti ha dato un PDF pieno di tabelle, alternative e grammature? NutriMy lo trasforma in un piano da seguire giorno per giorno, senza dover ricopiare nulla.

CARICHI IL PDF, AL RESTO PENSA NUTRIMY
Scegli il PDF da File, oppure condividilo con NutriMy da Mail o WhatsApp. In pochi secondi l'app riconosce pasti, giorni, tabelle di alimenti e quantità. La lettura avviene sul telefono.

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
Invia il menu del giorno, della settimana o la lista della spesa su WhatsApp, oppure esportali in PDF da stampare.

PROMEMORIA E WIDGET
• Un promemoria all'ora di ogni pasto, con il menu già scritto nella notifica
• Un riepilogo serale se manca qualche spunta
• Il widget in Home con il pasto in corso, da spuntare senza aprire l'app

LA TUA CRONOLOGIA
Il calendario delle giornate completate e la tua serie di giorni di fila. Resta anche quando carichi una nuova dieta, come le pesate.

PRIVATO PER SCELTA
Il PDF viene letto sul dispositivo e non viene inviato a nessuno. Nessun account obbligatorio: se vuoi, puoi creare un account gratuito (anche con Accedi con Apple) per salvare un backup online e ritrovare tutto su un nuovo iPhone. Puoi eliminarlo in qualsiasi momento dall'app.

NutriMy non sostituisce il tuo nutrizionista e non dà consigli medici: ti aiuta a seguire il piano che ti ha preparato lui.

Oggi NutriMy legge i piani «a scelta multipla» in formato Progeo Medical e simili. Se il tuo PDF non viene letto bene, scrivici: aggiungiamo nuovi formati.
```

### Parole chiave (100) — senza spazi dopo la virgola, senza ripetere nome/sottotitolo

```
nutrizionista,piano alimentare,lista della spesa,pasti,menu,peso,dietologo,alimentazione,pdf,diario
```

### Novità di questa versione (4000)

Versione 1.5.0:

```
• La tua serra: scegli una pianta tra dieci e falla crescere con le giornate completate, dal crescione in 5 giorni all'ulivo in 60. Portale a termine per riempire la serra e sbloccare le piante più rare.
• Ogni pianta ha il suo aspetto, dal basilico al bonsai d'ulivo, e una festa tutta sua quando entra in serra.
• Finestre e conferme ridisegnate nello stile di NutriMy.
```

Versione 1.4.0:

```
• La tua pianta: ogni giornata completata la fa crescere. Cinque giorni di fila e fiorisce, poi si illumina e ogni cinque giorni ti sorprende. Se salti un giorno si secca, ma puoi salvarla.
• Peso: registra il peso ogni giorno e guarda il grafico dell'andamento.
• Spunta un pasto intero con un tocco, dal cerchio accanto al suo nome.
• Esporta e condividi il menu di qualsiasi giorno della settimana, non solo di oggi.
• I giorni senza pasti nel piano non interrompono più la tua serie.
```

### URL

| Campo | Valore |
|---|---|
| URL di supporto (obbligatorio) | `https://nutrimy.themolinario.workers.dev/supporto` |
| URL marketing (facoltativo) | `https://nutrimy.themolinario.workers.dev/` |
| URL privacy policy (obbligatorio) | `https://nutrimy.themolinario.workers.dev/privacy` |

Le pagine sono già online (vedi sezione 9).

## 4. Screenshot e video

Gli screenshot sono in `store/screenshots-v2/`, già nelle dimensioni richieste:

| Cartella | Dispositivo in App Store Connect | Dimensione |
|---|---|---|
| `iphone-6.9/` | iPhone 6,9" | 1320 × 2868 |
| `iphone-6.5/` | iPhone 6,5" (se App Store Connect chiede questa) | 1284 × 2778 |
| `ipad-13/` | iPad 13" | 2064 × 2752 |

Ordine: `01` Oggi · `02` La tua serra · `03` Peso · `04` Scegli · `05` Settimana · `06` Spesa ·
`07` Promemoria e widget. Apple ricava da questi tutte le altre misure di iPhone e iPad.
La schermata Piano non è inclusa perché mostra nome, peso e BMI del PDF.

Video di anteprima (iPhone 6,9", 886 × 1920, 27,6 s): `store/marketing/video/out/preview-iphone.mp4`.
In App Store Connect si carica nella stessa sezione degli screenshot iPhone; come fotogramma
di copertina va bene quello della pianta fiorita (intorno ai 6 secondi).

> Dalla 1.5.0 il video mostra ancora la vecchia pianta a fiore unico: finché non viene
> rigirato con la serra, rilascia con `--skip-video` per lasciare quello già caricato.

Come si rifanno:

```sh
node store/marketing/icons.mjs          # icone Phosphor per grafiche e video (mai emoji)
node store/marketing/render.mjs         # screenshot da store/marketing/raw*/ e template.html
node store/marketing/video/build.mjs    # video dalle clip in store/marketing/video/clips/
```

Gli screenshot grezzi (`raw/`, `raw-ipad/`) e le clip (`record.sh` + i flussi Maestro in
`store/marketing/video/`) vengono dal simulatore con il PDF di esempio e la barra di stato a 09:41.

> L'app dichiara il supporto a iPad (`supportsTablet: true`), per questo servono gli
> screenshot iPad. Su iPad l'app mostra il layout del telefono allargato.

## 5. Classificazione per età

Rispondi **No / Nessuno** a tutte le domande del questionario (niente violenza, contenuti
sessuali, gioco d'azzardo, contenuti generati dagli utenti, chat, browser web aperto).
Risultato atteso: **4+**.

Alla domanda su *informazioni mediche o terapeutiche*: **No** (l'app mostra solo il piano
che l'utente carica, non fornisce indicazioni mediche).

## 6. Privacy dell'app (etichette sulla privacy)

**Raccogli dati da questa app?** → **Sì** (solo per chi crea l'account facoltativo).

| Tipo di dato | Collegato all'utente | Tracciamento | Scopo |
|---|---|---|---|
| Informazioni di contatto → **Indirizzo email** | Sì | No | Funzionalità dell'app |
| Identificativi → **ID utente** | Sì | No | Funzionalità dell'app |
| Salute e fitness → **Salute** | Sì | No | Funzionalità dell'app |
| Contenuto utente → **Altri contenuti dell'utente** | Sì | No | Funzionalità dell'app |
| Dati di utilizzo → **Interazione con il prodotto** | **No** | No | Analisi |

- *Salute*: il backup online contiene il piano alimentare letto dal PDF (che include
  i dati della visita: peso, altezza, BMI), il diario dei pasti e, dalla 1.4.0, le pesate
  registrate nell'app. La categoria è già dichiarata: non serve cambiare le etichette.
- *Altri contenuti*: scelte dei pasti, lista della spesa, promemoria.
- *Interazione con il prodotto*: statistiche anonime **solo con consenso** (schermata al
  primo avvio, interruttore in Piano): schermate aperte e funzioni usate, legate a un codice
  casuale del telefono, non all'account → «non collegato all'utente». Finiscono nella tabella
  `analytics_events` del Supabase del progetto; si leggono con `npm run stats`.
- Nessun dato è usato per pubblicità o tracciamento tra app (niente ATT); nessun SDK di terze
  parti per analytics.
- La ricerca degli alimenti invia il **testo cercato** a Open Food Facts senza nessun
  identificativo: non è una raccolta di dati personali.

## 7. Informazioni per la revisione (App Review)

- **Accesso richiesto**: No. Il login è facoltativo, si salta con «Salta».
- Contatto: Marco Molinari · themolinario@gmail.com · *(numero di telefono)*
- **Allegato**: `store/review/Dieta di esempio - NutriMy.pdf` (dieta reale anonimizzata:
  paziente «Mario Rossi», nutrizionista e misure inventati; il parser la legge identica).

### Note per il revisore (in inglese)

```
NutriMy turns the PDF diet plan written by an Italian nutritionist into a daily checklist and a shopping list. The app is in Italian.

No sign-in is required: on the welcome screens tap "Avanti" three times, answer the optional anonymous-statistics question ("Sì, va bene" or "No, grazie"), then tap "Salta" to skip the optional account.

To try the app you need a diet PDF: a sample plan with fictitious personal data is attached to this submission. To load it:
1. Save the attached PDF to the Files app (On My iPhone), or send it to the device by email/AirDrop.
2. In NutriMy tap "Carica il PDF della dieta" and pick the file (or open the PDF and share it to NutriMy).
3. The plan is parsed on the device in a few seconds and the "Oggi" (Today) tab opens.

Main features: "Oggi" (today's menu to tick), "Settimana" (next days, "Compila tutto" fills them), "Spesa" (shopping list generated from the choices), "Piano" (the parsed plan, reminders, account).

The optional account (email/password, Sign in with Apple or Google) only stores an online backup of the user's data. It can be deleted in the app: Piano › Account › Elimina account.

The PDF is parsed on the device. The only network calls are the optional backup (Supabase, EU servers), the food search (Open Food Facts, query text only) and, only if the user agrees on the consent screen, anonymous usage statistics (Supabase, EU servers; no plan content, not linked to the account, no tracking across apps).
```

## 8. Checklist prima dell'invio

- [ ] Build 1.5.0 caricata con `eas submit` e visibile in TestFlight
- [x] Pagine privacy e supporto online
- [ ] URL inseriti in App Store Connect
- [ ] Testi (sezione 3) incollati
- [ ] Screenshot iPhone 6,9" e iPad 13" (da `screenshots-v2/`) e video di anteprima caricati
- [ ] «Novità di questa versione» incollate (sezione 3)
- [ ] Classificazione per età compilata
- [ ] Etichette privacy compilate e pubblicate
- [ ] PDF di esempio allegato + note per il revisore incollate
- [ ] In «Accordi, imposte e coordinate bancarie»: accordo per app gratuite attivo
- [ ] **Conformità alle norme sull'esportazione**: già dichiarata nella build
      (`ITSAppUsesNonExemptEncryption: false`), non verrà chiesta
- [ ] **DSA (Unione Europea)**: dichiarati come *commerciante* o *non commerciante*
      (in Business › Conformità). Da commerciante, nome, indirizzo, email e telefono
      vengono pubblicati sulla pagina dell'app in UE.

## 9. Pagine web

`store/site/` (home, `privacy.html`, `supporto.html`) è pubblicata come Cloudflare Worker con
asset statici su **https://nutrimy.themolinario.workers.dev**. Per aggiornarla dopo una
modifica:

```sh
cd store && npx wrangler deploy
```
