import * as admin from "firebase-admin"

console.log("[Firebase Admin] Starting initialization...")
console.log("[Firebase Admin] Project ID present:", !!process.env.FIREBASE_PROJECT_ID)
console.log("[Firebase Admin] Client Email present:", !!process.env.FIREBASE_CLIENT_EMAIL)
console.log("[Firebase Admin] Private Key present:", !!process.env.FIREBASE_PRIVATE_KEY)

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  try {
    // Check if we have the required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      const missingVars = []
      if (!projectId) missingVars.push("FIREBASE_PROJECT_ID")
      if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL")
      if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY")

      console.error("[Firebase Admin] ❌ CRITICAL: Missing environment variables:", missingVars.join(", "))
      throw new Error(`Missing Firebase environment variables: ${missingVars.join(", ")}`)
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines in private key
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      })
      console.log("[Firebase Admin] ✅ Initialized successfully")
    }
  } catch (error) {
    console.error("[Firebase Admin] ❌ Initialization error:", error)
    throw error
  }
}

export const getFirestore = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized")
  }
  return admin.firestore()
}

export const getAdminDb = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized")
  }
  return admin.firestore()
}

export const adminDb = getAdminDb

export const getAdminAuth = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized")
  }
  return admin.auth()
}

export { admin }
