import * as admin from "firebase-admin"

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  try {
    // Check if we have the required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("[Firebase Admin] Missing environment variables. Webhook functionality will be limited.")
    } else {
      // Robustly parse the private key:
      // 1. Remove surrounding quotes if present
      // 2. Replace literal \n with actual newlines
      // 3. Handle base64-encoded keys
      let parsedKey = privateKey
      // Strip wrapping quotes
      if ((parsedKey.startsWith('"') && parsedKey.endsWith('"')) ||
          (parsedKey.startsWith("'") && parsedKey.endsWith("'"))) {
        parsedKey = parsedKey.slice(1, -1)
      }
      // Replace escaped newlines
      parsedKey = parsedKey.replace(/\\n/g, "\n")
      // If still no PEM header, try base64 decode
      if (!parsedKey.includes("-----BEGIN")) {
        try {
          const decoded = Buffer.from(parsedKey, "base64").toString("utf-8")
          if (decoded.includes("-----BEGIN")) {
            parsedKey = decoded
          }
        } catch {
          // not base64, use as-is
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: parsedKey,
        }),
      })
      console.log("[Firebase Admin] Initialized successfully")
    }
  } catch (error) {
    console.error("[Firebase Admin] Initialization error:", error)
  }
}

export const isFirebaseInitialized = () => {
  return admin.apps.length > 0
}

export const getFirestore = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized — check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars")
  }
  return admin.firestore()
}

export const getAdminDb = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized — check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars")
  }
  return admin.firestore()
}

export const adminDb = getAdminDb

export const getAdminAuth = () => {
  return admin.auth()
}

export { admin }

