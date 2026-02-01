# Beds24 Environment Variables Setup - API V2

## Sistema di Autenticazione Beds24 API V2

Beds24 API V2 utilizza un **sistema dual-token** per ottimizzare le performance e la sicurezza:

- **Read Token**: Token a lungo termine (~2 mesi) per operazioni GET (lettura)
- **Refresh Token**: Token che genera access token a breve termine per operazioni POST/PUT/DELETE (scrittura/cancellazione)
- **Write Access Token**: Token a breve termine (24 ore) generato dal refresh token per operazioni di scrittura
- **Auto-refresh**: Il sistema rigenera automaticamente i write access token quando scadono

---

## Variabili d'Ambiente Richieste

### 1. BEDS24_READ_TOKEN (OBBLIGATORIO)
\`\`\`env
BEDS24_READ_TOKEN=your_read_token_here
\`\`\`

**Descrizione:** Token a lungo termine (~2 mesi) usato per tutte le operazioni di lettura (GET).

**Come ottenerlo:**

1. **Genera un Invite Code per READ:**
   - Accedi al tuo account Beds24
   - Vai su **Settings** → **Account** → **API V2**
   - Clicca su **Generate Invite Code**
   - Seleziona SOLO gli scope di lettura:
     - ✅ `bookings:read` - Lettura prenotazioni
     - ✅ `reviews:read` - Lettura recensioni
     - ✅ `properties:read` - Lettura proprietà
     - ✅ `rooms:read` - Lettura camere
     - ❌ NON selezionare scope di write/delete
   - Clicca su **Generate Invite Code**
   - Copia l'invite code generato (es: `abc123xyz`)

2. **Scambia l'Invite Code per un Read Token:**
   
   Usa questo comando curl (sostituisci `YOUR_INVITE_CODE`):
   
   \`\`\`bash
   curl -X 'GET' \
     'https://beds24.com/api/v2/authentication/setup' \
     -H 'accept: application/json' \
     -H 'code: YOUR_INVITE_CODE'
   \`\`\`
   
   **Risposta:**
   \`\`\`json
   {
     "token": "qEK5L...",           // Questo è il READ TOKEN che ti serve!
     "expiresIn": 5184000,          // ~60 giorni (2 mesi)
     "refreshToken": "..."          // Ignora questo per il read token
   }
   \`\`\`

3. **Salva il Read Token:**
   - Copia il valore di `token` dalla risposta
   - Aggiungilo come variabile d'ambiente `BEDS24_READ_TOKEN`

**Durata:** ~2 mesi (poi va rigenerato)

**Tipo di Token:** Long-term read-only token

---

### 2. BEDS24_REFRESH_TOKEN (OBBLIGATORIO)
\`\`\`env
BEDS24_REFRESH_TOKEN=your_refresh_token_here
\`\`\`

**Descrizione:** Refresh token che genera access token a breve termine per operazioni di scrittura/cancellazione.

**Come ottenerlo:**

1. **Genera un Invite Code per WRITE:**
   - Accedi al tuo account Beds24
   - Vai su **Settings** → **Account** → **API V2**
   - Clicca su **Generate Invite Code**
   - Seleziona gli scope di scrittura/cancellazione:
     - ✅ `bookings:write` - Scrittura/modifica prenotazioni
     - ✅ `bookings:delete` - Cancellazione prenotazioni
     - ❌ NON serve selezionare scope di read (hai già il read token)
   - Clicca su **Generate Invite Code**
   - Copia l'invite code generato

2. **Scambia l'Invite Code per un Refresh Token:**
   
   \`\`\`bash
   curl -X 'GET' \
     'https://beds24.com/api/v2/authentication/setup' \
     -H 'accept: application/json' \
     -H 'code: YOUR_INVITE_CODE'
   \`\`\`
   
   **Risposta:**
   \`\`\`json
   {
     "token": "...",                // Access token iniziale (24h)
     "expiresIn": 86400,            // Secondi prima della scadenza
     "refreshToken": "iexTC..."     // REFRESH TOKEN - questo è quello che ti serve!
   }
   \`\`\`

3. **Salva il Refresh Token:**
   - Copia il valore di `refreshToken` dalla risposta
   - Aggiungilo come variabile d'ambiente `BEDS24_REFRESH_TOKEN`

**Durata:** Lungo termine (non scade automaticamente)

**Tipo di Token:** Refresh token per operazioni di scrittura

---

### 3. BEDS24_WEBHOOK_SECRET (OPZIONALE)
\`\`\`env
BEDS24_WEBHOOK_SECRET=your_custom_secret_here
\`\`\`

**Descrizione:** Segreto personalizzato per verificare l'autenticità dei webhook ricevuti da Beds24.

**Come configurarla:**
1. Genera una stringa casuale sicura (minimo 32 caratteri):
   \`\`\`bash
   openssl rand -base64 32
   \`\`\`
2. Aggiungi questa stringa come valore della variabile
3. Usa la stessa stringa quando configuri il webhook su Beds24

**Tipo di Token:** Secret statico (non scade)

---

## Come Funziona il Sistema Dual-Token

### 🔄 Flusso Automatico

#### Per Operazioni di Lettura (GET):
1. Il sistema usa direttamente il `BEDS24_READ_TOKEN`
2. Nessun overhead di refresh o chiamate extra
3. Performance ottimale per le letture frequenti
4. Il token va rigenerato manualmente ogni ~2 mesi

#### Per Operazioni di Scrittura (POST/PUT/DELETE):
1. **Prima richiesta:**
   - Il sistema usa il `BEDS24_REFRESH_TOKEN` per generare un write access token
   - Il write access token viene salvato in Firebase con timestamp di scadenza
   - Il write access token viene usato per la chiamata API

2. **Richieste successive:**
   - Il sistema controlla se il write access token è ancora valido
   - Se valido, lo usa direttamente (nessuna chiamata extra)
   - Se scaduto, genera automaticamente un nuovo write access token

3. **Gestione errori:**
   - Se una chiamata API ritorna 401 (Unauthorized)
   - Il sistema rigenera automaticamente il write access token
   - Riprova la chiamata con il nuovo token

### ⏱️ Durata dei Token

| Token Type | Durata | Uso | Auto-refresh |
|------------|--------|-----|--------------|
| **Read Token** | ~2 mesi | GET (lettura) | ❌ No (manuale ogni 2 mesi) |
| **Refresh Token** | Lungo termine | Genera write token | ❌ No (non scade) |
| **Write Access Token** | 24 ore | POST/PUT/DELETE | ✅ Sì (automatico) |

### 💾 Storage dei Token

- **Read Token**: Variabile d'ambiente (sicura, non cambia per 2 mesi)
- **Refresh Token**: Variabile d'ambiente (sicura, non scade)
- **Write Access Token**: Firebase Firestore (`system/beds24_write_token`)
- **Expiration Time**: Calcolato automaticamente con margine di sicurezza (5 minuti)

### 🎯 Vantaggi del Sistema Dual-Token

1. **Performance ottimale**: Le operazioni GET (più frequenti) non hanno overhead
2. **Sicurezza**: I token di scrittura scadono ogni 24 ore
3. **Affidabilità**: Auto-refresh automatico per i write token
4. **Semplicità**: Configurazione una tantum, manutenzione minima

---

## Configurazione Webhook su Beds24

Dopo aver impostato le variabili d'ambiente, configura il webhook su Beds24:

1. **URL del Webhook:**
   \`\`\`
   https://your-domain.com/api/beds24/webhook
   \`\`\`
   
2. **Metodo:** POST

3. **Eventi da monitorare:**
   - New Booking
   - Booking Modified
   - Booking Cancelled
   - New Review

4. **Header personalizzato:**
   - Nome: `x-beds24-signature`
   - Valore: Il valore di `BEDS24_WEBHOOK_SECRET`

---

## Rigenerazione dei Token

### Read Token (ogni ~2 mesi):

1. Genera un nuovo invite code con scope di read
2. Scambialo per un nuovo read token
3. Aggiorna `BEDS24_READ_TOKEN` su Vercel
4. Il sistema userà automaticamente il nuovo token

### Refresh Token (solo se necessario):

Il refresh token non scade automaticamente, ma va rigenerato se:
- Compromissione della sicurezza
- Cambio di scope/permessi
- Rotazione periodica (best practice annuale)

**Procedura:**
1. Genera un nuovo invite code con scope di write
2. Scambialo per un nuovo refresh token
3. Aggiorna `BEDS24_REFRESH_TOKEN` su Vercel
4. Il sistema userà automaticamente il nuovo token

### ⚠️ Importante:
- Imposta un reminder per rigenerare il read token ogni 2 mesi
- Il vecchio token viene invalidato quando ne generi uno nuovo
- Aggiorna la variabile d'ambiente immediatamente per evitare interruzioni
- Testa la connessione dal pannello admin dopo l'aggiornamento

---

## Variabili d'Ambiente Esistenti (già configurate)

### Firebase (per salvare i token e i dati sincronizzati)
\`\`\`env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
\`\`\`

### Vercel (per URL pubblici)
\`\`\`env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
\`\`\`

---

## Checklist di Setup Completo

- [ ] Generare invite code READ su Beds24 (solo scope di lettura)
- [ ] Scambiare invite code per read token
- [ ] Aggiungere `BEDS24_READ_TOKEN` su Vercel
- [ ] Generare invite code WRITE su Beds24 (solo scope di scrittura)
- [ ] Scambiare invite code per refresh token
- [ ] Aggiungere `BEDS24_REFRESH_TOKEN` su Vercel
- [ ] Generare `BEDS24_WEBHOOK_SECRET`
- [ ] Aggiungere `BEDS24_WEBHOOK_SECRET` su Vercel
- [ ] Configurare webhook su Beds24 con l'URL pubblico
- [ ] Testare la sincronizzazione dal pannello admin
- [ ] Verificare che i webhook funzionino correttamente
- [ ] Documentare i token in un password manager sicuro
- [ ] Impostare reminder per rigenerare il read token tra 2 mesi

---

## Monitoraggio e Manutenzione

### 📊 Controlli Periodici

1. **Verifica scadenza read token:**
   - Controlla ogni mese se il token è ancora valido
   - Imposta un reminder 1 settimana prima della scadenza (~55 giorni)

2. **Monitora i log:**
   - Controlla i log nel pannello admin
   - Cerca messaggi di errore relativi ai token
   - Verifica che l'auto-refresh dei write token funzioni correttamente

3. **Test manuale:**
   - Usa il pulsante "Sync Now" nel pannello admin
   - Verifica che le prenotazioni vengano sincronizzate
   - Controlla che le recensioni vengano importate
   - Testa il blocco date per verificare i write token

### 🔧 Funzioni di Manutenzione

Il sistema include funzioni per la manutenzione dei token:

\`\`\`typescript
// Forza il refresh del write access token (per testing)
await beds24Client.forceRefreshWriteToken()
\`\`\`

---

## Sicurezza

### ⚠️ Importante:

1. **Mai committare i token nel codice**
   - Le variabili d'ambiente sono già nel `.gitignore`
   - Usa sempre variabili d'ambiente per i token

2. **Proteggere l'accesso al pannello admin**
   - Solo gli amministratori autenticati possono sincronizzare i dati
   - Il webhook verifica la firma prima di accettare richieste

3. **Monitorare l'uso dell'API**
   - Controlla regolarmente i log di Beds24
   - Imposta alert per attività sospette
   - Verifica che l'auto-refresh non generi troppe richieste

4. **Backup dei token**
   - Salva entrambi i token in un password manager sicuro
   - Documenta chi ha accesso ai token
   - Mantieni una copia di backup in caso di emergenza

5. **Rotazione dei token**
   - Rigenera il read token ogni 2 mesi (obbligatorio)
   - Rigenera il refresh token annualmente (best practice)
   - Aggiorna immediatamente le variabili d'ambiente
   - Testa la connessione dopo ogni aggiornamento

6. **Principio del minimo privilegio**
   - Il read token ha SOLO permessi di lettura
   - Il refresh token ha SOLO permessi di scrittura/cancellazione
   - Separazione dei privilegi per maggiore sicurezza

---

## Troubleshooting

### Errore: "BEDS24_READ_TOKEN environment variable is required"
- Verifica che `BEDS24_READ_TOKEN` sia impostata su Vercel
- Controlla che non ci siano spazi extra nella variabile
- Assicurati di aver fatto il deploy dopo aver aggiunto la variabile

### Errore: "BEDS24_REFRESH_TOKEN environment variable is required"
- Verifica che `BEDS24_REFRESH_TOKEN` sia impostata su Vercel
- Controlla che non ci siano spazi extra nella variabile
- Assicurati di aver fatto il deploy dopo aver aggiunto la variabile

### Errore: "Token refresh failed: 401" (write operations)
- Il refresh token è invalido
- Verifica che il refresh token sia corretto
- Rigenera un nuovo refresh token se necessario

### Errore: "Beds24 API Error: 401" (read operations)
- Il read token è scaduto (~2 mesi)
- Genera un nuovo invite code per read
- Aggiorna `BEDS24_READ_TOKEN` su Vercel

### Errore: "Failed to obtain write access token"
- Verifica la connessione a Firebase
- Controlla che Firebase Admin sia configurato correttamente
- Verifica i permessi di scrittura su Firestore

### Sincronizzazione lettura funziona ma scrittura no
- Verifica che `BEDS24_REFRESH_TOKEN` sia configurato
- Controlla i log per errori specifici sul write token
- Testa manualmente l'endpoint `/api/beds24/block-dates`
- Verifica che gli scope del refresh token includano write/delete

### Write access token si rigenera troppo spesso
- Controlla che l'orologio del server sia sincronizzato
- Verifica che il calcolo della scadenza sia corretto
- Controlla i log per vedere quando avviene il refresh

---

## Supporto

### Documentazione Ufficiale
- API V2 Docs: https://wiki.beds24.com/index.php/Category:API_V2
- Swagger: https://beds24.com/api/v2/
- Authentication Guide: https://wiki.beds24.com/index.php/PMSs:_How_to_connect_to_Beds24_and_use_Booking.com_via_API_V2

### Supporto Beds24
- Email: support@beds24.com
- Wiki: https://wiki.beds24.com/

### Supporto Integrazione
- Controlla i log nel pannello admin
- Verifica le variabili d'ambiente su Vercel
- Testa gli endpoint API manualmente con Postman o curl
