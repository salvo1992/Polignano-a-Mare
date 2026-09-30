import "server-only"

export interface StorageDiagnostics {
  uploadProvider: "firebase-storage"
  firebase: { bucketConfigured: boolean; bucketSource: "server" | "public" | "missing" }
  blob: {
    readWriteTokenConfigured: boolean
    storeIdConfigured: boolean
    oidcTokenAvailable: boolean
    configuration: "oidc" | "read_write_token" | "incomplete" | "not_configured"
    accessVerified: false
    uploadVerified: false
  }
}

// Deliberate allowlist: never return environment values, identifiers or credentials.
export function getStorageDiagnostics(env: NodeJS.ProcessEnv = process.env): StorageDiagnostics {
  const present = (value: string | undefined) => Boolean(value?.trim())
  const serverBucket = present(env.FIREBASE_STORAGE_BUCKET)
  const publicBucket = present(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  const readWriteTokenConfigured = present(env.BLOB_READ_WRITE_TOKEN)
  const storeIdConfigured = present(env.BLOB_STORE_ID)
  const oidcTokenAvailable = present(env.VERCEL_OIDC_TOKEN)

  return {
    uploadProvider: "firebase-storage",
    firebase: {
      bucketConfigured: serverBucket || publicBucket,
      bucketSource: serverBucket ? "server" : publicBucket ? "public" : "missing",
    },
    blob: {
      readWriteTokenConfigured,
      storeIdConfigured,
      oidcTokenAvailable,
      configuration: storeIdConfigured && oidcTokenAvailable ? "oidc"
        : readWriteTokenConfigured ? "read_write_token"
        : storeIdConfigured ? "incomplete" : "not_configured",
      // Presence is not proof of authorization, bucket existence or successful writes.
      accessVerified: false,
      uploadVerified: false,
    },
  }
}
