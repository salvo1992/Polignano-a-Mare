# Editor camere e foto

L'editor si apre da **Admin > Camere > Modifica camera e foto**. Gestisce le due
camere esistenti (ID 1 Acies, ID 2 Acquaroom), senza cambiare gli ID collegati alle
prenotazioni e a Smoobu. Non aggiunge nuove camere e non modifica la capienza.

## Prima della pubblicazione

Configurare sull'ambiente di esecuzione le variabili Firebase già usate dal sito:
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
Sul server servono `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`. La chiave privata deve rimanere sul server.

Il bucket può essere indicato in `FIREBASE_STORAGE_BUCKET`; in alternativa viene
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

`node --test tests/room-content.test.cjs`

I test coprono galleria e copertina, caricamenti, validazione, conflitti,
fallimenti parziali e risultati incerti delle transazioni con dipendenze simulate.
Per la prova completa usare un ambiente Firebase di test: amministratore e
utente ordinario, caricamento reale, ricaricamento della pagina, controllo delle
tre pagine pubbliche e verifica di prezzo/stato/capienza rimasti invariati.
