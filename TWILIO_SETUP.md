# Configurazione Twilio per SMS

## Perché Twilio?
- **$15 di credito gratuito** quando ti registri (circa 2000 SMS)
- Dopo costa **€0.007 per SMS** (pochissimo!)
- Affidabile e professionale
- Facile da configurare

## Come Configurare

### 1. Crea Account Twilio
1. Vai su [twilio.com](https://www.twilio.com/try-twilio)
2. Registrati gratuitamente
3. Verifica il tuo numero di telefono

### 2. Ottieni le Credenziali
1. Vai alla [Console Twilio](https://console.twilio.com/)
2. Copia:
   - **Account SID**
   - **Auth Token**
3. Vai su **Phone Numbers** > **Manage** > **Buy a number**
4. Acquista un numero (gratis con il credito iniziale)
5. Copia il **Phone Number** (formato: +1234567890)

### 3. Aggiungi le Variabili d'Ambiente
Aggiungi queste variabili nel tuo progetto Vercel (sezione Vars nella sidebar):

\`\`\`
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
\`\`\`

### 4. Testa il Sistema
1. Vai su Impostazioni Admin
2. Attiva il toggle "Invia OTP via SMS"
3. Richiedi un codice OTP
4. Riceverai il codice via SMS sul tuo numero registrato!

## Costi
- **Primi $15**: Gratuiti (circa 2000 SMS)
- **Dopo**: €0.007 per SMS
- **Per 50 SMS all'anno**: ~€0.35/anno (praticamente gratis!)

## Note
- Usa SMS solo come backup quando necessario
- Usa Email (Resend) per uso quotidiano (gratuita)
- Con pochi SMS all'anno, i costi sono irrisori

## Troubleshooting
Se ricevi errori:
1. Verifica che le credenziali siano corrette
2. Verifica che il numero Twilio sia in formato internazionale (+1234567890)
3. Verifica che il numero dell'admin nel database sia in formato internazionale
