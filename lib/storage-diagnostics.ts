import "server-only"

export interface StorageDiagnostics {
  uploadProvider: "firebase-storage" | "vercel-blob"
  firebase: { bucketConfigured: boolean; bucketSource: "server" | "public" | "missing" }
  blob: {
    readWriteTokenConfigured: boolean
    storeIdConfigured: boolean
    oidcTokenAvailable: boolean
    configuration: "saved_token" | "oidc" | "read_write_token" | "incomplete" | "not_configured"
    accessVerified: boolean
    uploadVerified: boolean
    verifiedAt: string | null
  }
}

// Deliberate allowlist: never return environment values, identifiers or credentials.
export function getStorageDiagnostics(env: NodeJS.ProcessEnv = process.env, savedBlob?: { configured: boolean; verifiedAt: string | null }): StorageDiagnostics {
  const present = (value: string | undefined) => Boolean(value?.trim())
  const serverBucket = present(env.FIREBASE_STORAGE_BUCKET)
  const publicBucket = present(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  const readWriteTokenConfigured = present(env.BLOB_READ_WRITE_TOKEN)
  const storeIdConfigured = present(env.BLOB_STORE_ID)
  const oidcTokenAvailable = present(env.VERCEL_OIDC_TOKEN)

  return {
    uploadProvider: savedBlob?.configured ? "vercel-blob" : "firebase-storage",
    firebase: {
      bucketConfigured: serverBucket || publicBucket,
      bucketSource: serverBucket ? "server" : publicBucket ? "public" : "missing",
    },
    blob: {
      readWriteTokenConfigured,
      storeIdConfigured,
      oidcTokenAvailable,
      configuration: savedBlob?.configured ? "saved_token" : storeIdConfigured && oidcTokenAvailable ? "oidc"
        : readWriteTokenConfigured ? "read_write_token"
        : storeIdConfigured ? "incomplete" : "not_configured",
      // Presence is not proof of authorization, bucket existence or successful writes.
      accessVerified: Boolean(savedBlob?.configured && savedBlob.verifiedAt),
      uploadVerified: Boolean(savedBlob?.configured && savedBlob.verifiedAt),
      verifiedAt: savedBlob?.verifiedAt ?? null,
    },
  }
}
