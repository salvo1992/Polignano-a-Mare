# Editor camere e foto

L'editor si apre da **Admin > Camere > Modifica camera e foto**. Gestisce le due
camere esistenti (ID 1 Acies, ID 2 Acquaroom), senza cambiare gli ID collegati alle
prenotazioni e a Smoobu. Non aggiunge nuove camere e non modifica la capienza.

## Foto su Vercel Blob (senza nuove variabili nel vecchio hosting)

Lo storage dedicato è `al22suite`, ID `store_XCl7resVDboCUh6e`, pubblico,
nel team `ekobitsrl-4449s-projects`. URL del pannello:
https://vercel.com/ekobitsrl-4449s-projects/~/stores/blob/store_XCl7resVDboCUh6e/guides

1. Accedere con l'account admin **al22suite@gmail.com**. Aprire **Admin >
   Impostazioni > Archivio foto — area personale > Mostra configurazione Blob**.
2. Copiare da Vercel il solo valore `BLOB_READ_WRITE_TOKEN` dello storage dedicato.
   Incollarlo nel campo password; non inviarlo in chat né inserirlo in GitHub.
3. Premere **Verifica e collega Blob**. Il server controlla che il token appartenga
   allo storage previsto, carica una piccola PNG in `al22/storage-check/`, ne
   verifica la lettura pubblica e la rimuove. Solo dopo salva la configurazione.
4. Da **Camere**, aprire **Modifica camera e foto**, caricare una foto e salvare. La nuova foto
   viene salvata in `al22/rooms/<id>/`; le immagini precedenti rimangono invariate.
5. **Prova caricamento foto** ripete la prova con il token già salvato, senza
   modificare gallerie o configurazione. Il controllo consuma poche operazioni
   Blob; non è un monitoraggio automatico.

Il riquadro tecnico è chiuso per default. **Nascondi configurazione Blob** lo
richiude e cancella dal campo eventuali token non ancora inviati. Durante un
collegamento o una prova il pulsante di chiusura è disabilitato. Il riquadro non
compare per gli altri admin; questi mantengono la possibilità di modificare camere
e foto senza accedere alla configurazione tecnica. L'area Camere non contiene
più né il collegamento Blob né la diagnostica dello storage.

Il token viene cifrato con AES-256-GCM nel documento
`server_credentials/room_blob`, non nella raccolta pubblica `settings`. La chiave
di cifratura è derivata, con HKDF e contesto dedicato, dalla chiave privata Firebase
già presente sul server. La chiave non viene copiata o restituita al browser.
Una rotazione della chiave Firebase richiede di reinserire il token Blob.
GET restituisce soltanto stato, ID pubblico dello storage e data della prova;
nessun token o errore grezzo del provider viene esposto. Non esiste una cache del
token tra richieste. Il salvataggio di una camera mantiene la stessa credenziale
per upload e pulizia, anche se il titolare la cambia nel frattempo.

`GET/POST /api/admin/blob-storage` e `GET /api/admin/storage-diagnostics`
controllano token Firebase, ruolo admin e account attivo con email
`al22suite@gmail.com`. L'email viene letta da Firebase Authentication sul server,
non dal profilo Firestore modificabile né dal solo token potenzialmente vecchio.
La restrizione vale anche chiamando direttamente le API. Non assegna ruoli admin.
`firestore.rules` nega espressamente l'accesso client a `server_credentials`;
questa modifica nel repository non pubblica automaticamente le regole. Prima
dell'attivazione verificare anche quelle effettive. Il controllo anonimo del
30/09/2026 ha restituito 403 sul documento `server_credentials/room_blob` e 200
sulla camera pubblica usata come controllo.

Chi possiede hosting/database conserva privilegi amministrativi: questa soluzione
non sostituisce il trasferimento del sito su account controllati dal cliente.
Il Blob dedicato non deve contenere documenti personali o altri dati riservati.

Fino al collegamento viene mantenuto il vecchio backend Firebase Storage.
Dopo il collegamento un errore Blob o una credenziale non leggibile blocca i nuovi
upload: **nessun fallback silenzioso**. I salvataggi senza nuove foto non dipendono
dallo storage. Un token nuovo non sostituisce quello precedente se la prova fallisce.
In caso di timeout di un upload possono restare file orfani: non vengono eliminati
oggetti di cui non è certa l'appartenenza alla richiesta. La pulizia ordinaria
non cancella mai immagini già pubblicate o altri file dello storage.

L'SDK è fissato a `@vercel/blob@2.8.0` (Node.js >=20), con token esplicito per questo
storage. Non richiede di collegare al nuovo team il vecchio progetto Vercel.

## Prima della pubblicazione

Configurare sull'ambiente di esecuzione le variabili Firebase già usate dal sito:
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
Sul server servono `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`. La chiave privata deve rimanere sul server.

Solo per il backend Firebase precedente, il bucket può essere indicato in `FIREBASE_STORAGE_BUCKET`; in alternativa viene
usato `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Deve esistere ed essere accessibile
all'account di servizio per creare e rimuovere oggetti. Le foto pubblicate hanno
URL pubblici con token, necessari per mostrarle ai visitatori del sito.

Pubblicare le regole aggiornate di `firestore.rules` prima di abilitare l'editor.
Impediscono a un utente di assegnarsi da solo il ruolo admin. Il ruolo di un
amministratore va attribuito tramite un ambiente amministrativo attendibile.
Le API controllano il token Firebase e il ruolo nel documento utente a ogni
richiesta. Non basta il cookie usato per la navigazione del pannello.

Le modifiche nel repository locale non sono state pubblicate automaticamente.
Nella cartella non erano presenti le configurazioni Firebase per verificare un
salvataggio reale. Non effettuare un push che avvii una pubblicazione automatica
prima di aver predisposto ambiente, bucket e regole.

## Dati e comportamento

- Testi, caratteristiche e galleria ordinata: campo `content` in `rooms/1` e
  `rooms/2`, con revisione per rilevare modifiche concorrenti.
- Al primo utilizzo vengono proposti testi e gallerie già presenti nel progetto.
  Nessuna migrazione o scrittura automatica all'apertura del pannello.
- Nome, descrizione, servizi, letti, bagni, superficie e immagini sono riportati
  anche nei campi della scheda usati dal pannello esistente. Prezzo, capienza e
  stato già salvati vengono conservati.
- La prima foto è la copertina. Massimo 30 foto per camera e almeno una foto.
- Il browser adatta le immagini a un lato massimo di 1600 pixel e le converte
  in JPEG. Accetta JPG, PNG e WebP fino a 20 MB prima dell'ottimizzazione.
- Il server accetta fino a 2 MB per foto ottimizzata e 3 MB di nuove foto per
  salvataggio, con un limite di 4 MB per l'intera richiesta multipart.
- Il caricamento avviene solo con **Salva modifiche**. Il salvataggio della
  galleria avviene in una transazione dopo i caricamenti. Un conflitto non
  sovrascrive le modifiche dell'altro amministratore.
- La rimozione toglie una foto dalla galleria: non cancella gli oggetti già
  pubblicati dal bucket. Questo evita di interrompere collegamenti precedenti.
  Un errore di rete con esito incerto della transazione conserva gli oggetti
  nuovi; eventuali file inutilizzati richiedono pulizia amministrativa separata.
- I testi inseriti vengono mostrati in tutte le lingue; l'editor non gestisce
  traduzioni separate. Le modifiche sono lette dalla home, elenco, dettaglio e
  nomi camera nei moduli di prenotazione al successivo caricamento della pagina.

## Verifica ripetibile

### Diagnostica configurazione foto

Da **Admin > Impostazioni > Archivio foto — area personale > Mostra configurazione
Blob > Verifica archivio foto > Verifica configurazione foto**
si interroga `GET /api/admin/storage-diagnostics`. La rotta verifica il token
Firebase, il ruolo admin e l'account titolare prima di leggere la configurazione, non è memorizzabile
in cache e restituisce soltanto booleani e stati predefiniti. Non restituisce
valori, nomi di bucket, ID di archivio, token o errori dei provider.

Vengono controllate esclusivamente `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`,
`VERCEL_OIDC_TOKEN`, `FIREBASE_STORAGE_BUCKET` e
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Eventuali nomi personalizzati non sono
rilevati. Un token OIDC senza identificativo Blob non indica un archivio collegato.

La verifica non effettua chiamate a Blob/Storage né scritture: **presenza delle
variabili non significa credenziali valide o permessi di caricamento**. Legge anche
la configurazione Blob salvata: se presente, indica il provider attivo e la data
della prova effettuata al collegamento. Per un controllo attuale usare **Prova
caricamento foto**. Non migra o modifica le gallerie.

`node --test tests/storage-diagnostics.test.cjs`

`node --test tests/room-blob.test.cjs`

I test Blob usano un provider simulato: verificano cifratura, token errati,
autenticazione, limiti richieste, errori, pulizia limitata ai file nuovi e mancata
sostituzione delle credenziali su errore. La prova live richiede il token inserito
dall'amministratore: una build riuscita non prova il caricamento reale.

### Salvataggio delle camere

`node --test tests/room-content.test.cjs`

I test coprono galleria e copertina, caricamenti, validazione, conflitti,
fallimenti parziali e risultati incerti delle transazioni con dipendenze simulate.
Per la prova completa usare un ambiente Firebase di test: amministratore e
utente ordinario, caricamento reale, ricaricamento della pagina, controllo delle
tre pagine pubbliche e verifica di prezzo/stato/capienza rimasti invariati.
