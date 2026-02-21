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
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines in private key
          privateKey: privateKey.replace(/\\n/g, "\n"),
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

