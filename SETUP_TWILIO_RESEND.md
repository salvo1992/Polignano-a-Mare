# Guida Configurazione Twilio e Resend

## Sistema OTP Ibrido

Il sistema di sicurezza admin utilizza:
- **Cambio Email**: OTP via SMS (Twilio)
- **Cambio Password**: OTP via Email (Resend)
- **Cambio Telefono**: OTP via Email (Resend)

---

## 1. Configurazione Twilio (per SMS)

### Registrazione
1. Vai su [twilio.com](https://www.twilio.com)
2. Clicca su "Sign up"
3. Compila il form con i tuoi dati
4. Verifica email e numero di telefono
5. Ricevi **$15 di credito gratuito** (~2000 SMS)

### Configurazione Account
1. Dopo il login, vai su [Console](https://console.twilio.com/)
2. Trovi sul Dashboard:
   - **Account SID** (es: ACxxxxxxxxxxxxxxxxxxxxx)
   - **Auth Token** (clicca "Show" per vederlo)

### Acquisto Numero Telefono
1. Vai su Phone Numbers → Buy a Number
2. Seleziona Paese: **Italy** (+39)
3. Capabilities: Seleziona **SMS**
4. Acquista il numero (costa ~€1/mese)
5. Copia il numero nel formato: **+39xxxxxxxxx**

### Aggiungi Variabili d'Ambiente
Vai nelle impostazioni Vercel (o .env locale) e aggiungi:

\`\`\`env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+39xxxxxxxxx
\`\`\`

### Costi
- **Credito iniziale**: $15 gratuiti
- **SMS Italia**: €0.007 per SMS
- **Numero telefonico**: ~€1/mese
- **Esempio**: Con $15 puoi inviare ~2000 SMS

---

## 2. Configurazione Resend (per Email)

### Verifica Configurazione Attuale
Resend è già configurato nel progetto. Verifica che nelle variabili d'ambiente ci siano:

\`\`\`env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tuodominio.com
\`\`\`

### Se Non Configurato
1. Vai su [resend.com](https://resend.com)
2. Registrati gratuitamente
3. Vai su API Keys → Create API Key
4. Copia la chiave e aggiungila alle variabili d'ambiente

### Dominio Personalizzato (Opzionale)
1. Vai su Domains → Add Domain
2. Aggiungi il tuo dominio (es: tuodominio.com)
3. Configura i record DNS come indicato
4. Usa email tipo: noreply@tuodominio.com

### Limiti Gratuiti
- **3.000 email/mese** gratuiti
- **100 email/giorno** gratuiti
- Perfetto per OTP admin (pochi invii al mese)

---

## 3. Test del Sistema

### Test Locale
1. Avvia il progetto: `npm run dev`
2. Vai su `/admin` → Impostazioni
3. Prova a cambiare:
   - **Email**: Riceverai SMS
   - **Password**: Riceverai Email
   - **Telefono**: Riceverai Email

### Verifica SMS (Twilio)
- Vai su Twilio Console → Logs → Messaging
- Vedi tutti gli SMS inviati con stato delivery

### Verifica Email (Resend)
- Vai su Resend Dashboard → Emails
- Vedi tutte le email inviate con stato delivered

---

## 4. Database Firestore

### Aggiungi Numero Admin
Prima di usare il cambio email (che richiede SMS), aggiungi il numero admin:

1. Vai su Firebase Console → Firestore
2. Collezione: `users`
3. Documento: `{UID_ADMIN}`
4. Aggiungi campo:
   \`\`\`
   phone: "+393757017689"
   \`\`\`
   (Sostituisci con il tuo numero reale)

---

## 5. Risoluzione Problemi

### SMS Non Arriva
- Verifica che il numero sia in formato internazionale: `+39xxxxxxxxx`
- Controlla credito Twilio (Dashboard)
- Vedi logs su Twilio Console → Messaging

### Email Non Arriva
- Controlla spam/junk
- Verifica API key Resend
- Vedi logs su Resend Dashboard

### Codice OTP Scaduto
- Il codice dura 10 minuti
- Richiedilo di nuovo se scaduto

---

## 6. Sicurezza

### Protezione
- Codici OTP vengono salvati in Firestore con scadenza
- Codici validi solo 10 minuti
- Un codice può essere usato una sola volta

### Backup
Se perdi accesso all'email:
- Usa il cambio email (ricevi SMS)
- Cambia email di recupero

Se perdi accesso al telefono:
- Usa il cambio password (ricevi Email)
- Poi cambia numero telefono

---

## Riepilogo Costi Annuali

| Servizio | Costo |
|----------|-------|
| Twilio SMS (~10/anno) | €0.07 |
| Twilio Numero | €12/anno |
| Resend Email | Gratuito (3k/mese) |
| **TOTALE** | **~€12/anno** |

Costi minimi per un sistema professionale e sicuro!
