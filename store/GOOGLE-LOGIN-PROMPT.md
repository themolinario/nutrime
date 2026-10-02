Usa Claude in Chrome per sistemare «Accedi con Google» di NutriMy su Android. Sono già loggato in
Chrome con l'account che gestisce sia la Google Play Console sia Google Cloud.

Contesto: su Android il login con Google funziona solo se l'impronta SHA-1 del certificato che
firma l'app è registrata in un ID client OAuth di tipo **Android** su Google Cloud. L'app
scaricata da Google Play è firmata dalla chiave di Google Play, che oggi non è registrata.
Il codice dell'app è corretto: non va toccato.

Dati fissi:
- Pacchetto Android: `com.marcomolinari.nutrime`
- ID client **Web** già in uso dall'app (NON modificarlo):
  `793646470458-a3i9bd3lrqakrvho8k6ihunqsfbo51i2.apps.googleusercontent.com`
- SHA-1 della chiave di caricamento (EAS), già nota:
  `17:6B:1C:17:F2:65:B2:4F:08:ED:67:B7:75:18:C9:C6:59:06:71:F2`

Fai, in una scheda nuova:

1. **Play Console** (https://play.google.com/console) → app NutriMy → Test e rilascio →
   Configurazione → **Integrità dell'app** → scheda **Firma delle app**. Copia l'impronta
   **SHA-1** del **certificato della chiave di firma dell'app**. Controlla anche la SHA-1 del
   certificato della chiave di caricamento: deve coincidere con quella qui sopra; se è diversa,
   dimmelo.

2. **Google Cloud** (https://console.cloud.google.com) → apri il progetto che contiene l'ID
   client Web qui sopra (il numero del progetto è 793646470458) → API e servizi → **Credenziali**.
   Elenca gli ID client OAuth esistenti di tipo Android con il loro SHA-1.

3. Per ciascuna di queste SHA-1 che non è già registrata con il pacchetto
   `com.marcomolinari.nutrime`, crea un nuovo **ID client OAuth → Tipo: Android**:
   - «NutriMy Android – Play» con la SHA-1 della chiave di firma di Play (punto 1)
   - «NutriMy Android – upload» con la SHA-1 di caricamento qui sopra
   Nome pacchetto `com.marcomolinari.nutrime`. Lascia vuoti gli altri campi facoltativi.

4. Sempre in Google Cloud → API e servizi → **Schermata di consenso OAuth** (o «Google Auth
   Platform»): dimmi lo stato di pubblicazione. Se è «In test», NON cambiarlo: dimmelo e
   chiedimi se pubblicarlo (in test possono accedere solo gli utenti di prova).

5. Alla fine riepilogami: le SHA-1 trovate, i client creati (con il loro ID) e lo stato della
   schermata di consenso.

Regole:
- NON modificare né eliminare l'ID client Web, né altri client esistenti.
- NON toccare chiavi, account di servizio, fatturazione, altre API o altri progetti.
- Se una pagina è diversa da come la descrivo, segui quello che vedi e dimmelo.
- Se un passaggio chiede una conferma non prevista qui, fermati e chiedimelo.
