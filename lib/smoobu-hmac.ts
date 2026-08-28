import { createHash, createHmac, randomUUID } from "node:crypto"

interface CreateSmoobuHmacHeadersOptions {
  url: string
  method: string
  body: string
  apiKey: string
  apiSecret: string
  timestamp?: string
  nonce?: string
}

export function createSmoobuHmacHeaders({
  url,
  method,
  body,
  apiKey,
  apiSecret,
  timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  nonce = randomUUID(),
}: CreateSmoobuHmacHeadersOptions): Record<string, string> {
  const parsedUrl = new URL(url)
  const canonicalQuery = new URLSearchParams(parsedUrl.searchParams)
  canonicalQuery.sort()

  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex")
  const canonicalRequest = [
    method.toUpperCase(),
    parsedUrl.pathname,
    canonicalQuery.toString(),
    timestamp,
    nonce,
    bodyHash,
    apiKey,
  ].join("\n")
  const signature = createHmac("sha256", apiSecret)
    .update(canonicalRequest, "utf8")
    .digest("base64")

  return {
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
  }
}
