import "server-only"

import { getAdminDb } from "@/lib/firebase-admin"

const CREDENTIALS_COLLECTION = "server_credentials"
const CREDENTIALS_DOCUMENT = "smoobu"
const CACHE_TTL_MS = 60_000

export interface SmoobuCredentials {
  apiKey: string
  apiSecret?: string
  source: "firestore" | "environment"
}

export interface SmoobuCredentialsStatus {
  configured: boolean
  hmacEnabled: boolean
  maskedApiKey: string | null
  source: SmoobuCredentials["source"] | null
  updatedAt: string | null
}

interface StoredSmoobuCredentials {
  apiKey?: unknown
  apiSecret?: unknown
  updatedAt?: { toDate?: () => Date } | string
}

let credentialsCache:
  | {
      credentials: SmoobuCredentials | null
      updatedAt: string | null
      expiresAt: number
    }
  | undefined

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toIsoDate(value: StoredSmoobuCredentials["updatedAt"]): string | null {
  if (!value) return null

  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }

  return null
}

async function resolveSmoobuCredentials(): Promise<{
  credentials: SmoobuCredentials | null
  updatedAt: string | null
}> {
  if (credentialsCache && credentialsCache.expiresAt > Date.now()) {
    return credentialsCache
  }

  let stored: StoredSmoobuCredentials | undefined
  try {
    const snapshot = await getAdminDb()
      .collection(CREDENTIALS_COLLECTION)
      .doc(CREDENTIALS_DOCUMENT)
      .get()
    stored = snapshot.exists ? (snapshot.data() as StoredSmoobuCredentials) : undefined
  } catch (error) {
    console.warn(
      "[Smoobu] Impossibile leggere la configurazione server da Firebase; provo le variabili d'ambiente.",
      error instanceof Error ? error.message : error,
    )
  }

  const storedApiKey = asNonEmptyString(stored?.apiKey)
  const storedApiSecret = asNonEmptyString(stored?.apiSecret)
  const environmentApiKey = asNonEmptyString(process.env.SMOOBU_API_KEY)
  const environmentApiSecret = asNonEmptyString(process.env.SMOOBU_API_SECRET)

  let credentials: SmoobuCredentials | null = null
  if (storedApiKey) {
    credentials = {
      apiKey: storedApiKey,
      apiSecret: storedApiSecret,
      source: "firestore",
    }
  } else if (environmentApiKey) {
    credentials = {
      apiKey: environmentApiKey,
      apiSecret: environmentApiSecret,
      source: "environment",
    }
  }

  const resolved = {
    credentials,
    updatedAt: storedApiKey ? toIsoDate(stored?.updatedAt) : null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  credentialsCache = resolved
  return resolved
}

export async function getSmoobuCredentials(): Promise<SmoobuCredentials> {
  const { credentials } = await resolveSmoobuCredentials()
  if (!credentials) {
    throw new Error("Configurazione Smoobu mancante")
  }
  return credentials
}

export async function getSmoobuCredentialsStatus(): Promise<SmoobuCredentialsStatus> {
  const { credentials, updatedAt } = await resolveSmoobuCredentials()
  const apiKey = credentials?.apiKey

  return {
    configured: Boolean(apiKey),
    hmacEnabled: Boolean(apiKey && credentials?.apiSecret),
    maskedApiKey: apiKey ? `${"*".repeat(Math.min(8, Math.max(4, apiKey.length - 4)))}${apiKey.slice(-4)}` : null,
    source: credentials?.source ?? null,
    updatedAt,
  }
}

export async function saveSmoobuCredentials(
  apiKey: string,
  apiSecret: string,
  updatedBy: string,
): Promise<void> {
  await getAdminDb()
    .collection(CREDENTIALS_COLLECTION)
    .doc(CREDENTIALS_DOCUMENT)
    .set({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      updatedAt: new Date(),
      updatedBy,
    })

  clearSmoobuCredentialsCache()
}

export function clearSmoobuCredentialsCache(): void {
  credentialsCache = undefined
}
