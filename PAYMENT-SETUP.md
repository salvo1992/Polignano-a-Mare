# Configurazione Pagamenti

## Variabili d'Ambiente Necessarie

Crea un file `.env.local` nella root del progetto con le seguenti variabili:

### Firebase
\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=polignano-a-mare.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=polignano-a-mare
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=polignano-a-mare.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

### Stripe
\`\`\`env
STRIPE_SECRET_KEY=sk_test_... (o sk_live_... per produzione)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (o pk_live_... per produzione)
\`\`\`

### PayPal
\`\`\`env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox (o live per produzione)
\`\`\`

### Satispay
\`\`\`env
SATISPAY_API_KEY=your_satispay_api_key
SATISPAY_MODE=staging (o live per produzione)
\`\`\`

### UniCredit
\`\`\`env
UNICREDIT_API_KEY=your_unicredit_api_key
UNICREDIT_MERCHANT_ID=your_merchant_id
UNICREDIT_MODE=test (o live per produzione)
\`\`\`

## Configurazione Firebase Console

1. **Vai su https://console.firebase.google.com**
2. **Seleziona il progetto "polignano-a-mare"**
3. **Abilita Firestore Database:**
   - Vai su "Build" → "Firestore Database"
   - Clicca "Create database"
   - Scegli "Start in production mode"
   - Seleziona la location (europe-west1)

4. **Abilita Authentication:**
   - Vai su "Build" → "Authentication"
   - Clicca "Get started"
   - Abilita "Email/Password"
   - Abilita "Google" (opzionale)

5. **Configura le regole di sicurezza Firestore:**
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Rooms collection
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
\`\`\`

## Inizializzazione Database

Dopo aver configurato Firebase, esegui lo script per inizializzare le camere:

\`\`\`bash
npm run init-rooms
\`\`\`

Questo creerà le due camere nel database Firestore.

## Test Pagamenti

### Stripe (Test Mode)
- Carta di test: 4242 4242 4242 4242
- Data scadenza: qualsiasi data futura
- CVC: qualsiasi 3 cifre

### PayPal (Sandbox)
- Usa un account PayPal Sandbox per testare

### Satispay (Staging)
- Usa l'app Satispay in modalità staging

### UniCredit (Test)
- Usa le credenziali di test fornite da UniCredit

## Note Importanti

1. **NON servono Cloud Functions** - tutto è implementato nelle API routes Next.js
2. **Le API routes girano server-side** - nessun problema CORS
3. **Le chiavi segrete sono sicure** - non vengono esposte al client
4. **Webhook**: Configura i webhook per ogni provider per ricevere notifiche di pagamento
