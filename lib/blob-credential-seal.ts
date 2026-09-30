import "server-only"
import { createCipheriv, createDecipheriv, createPrivateKey, hkdfSync, randomBytes } from "node:crypto"

const CONTEXT = "al22/server_credentials/room_blob/v1"
export interface SealedBlobToken { version: 1; iv: string; tag: string; ciphertext: string }

function encryptionKey(raw = process.env.FIREBASE_PRIVATE_KEY) {
  if (!raw) throw new Error("Server encryption key unavailable")
  let pem = raw.trim().replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/\\n/g, "\n")
  if (!pem.includes("-----BEGIN")) pem = Buffer.from(pem, "base64").toString("utf8")
  // Canonical DER keeps the derived key stable across PEM escaping/format changes.
  const key = createPrivateKey(pem).export({ type: "pkcs8", format: "der" })
  return Buffer.from(hkdfSync("sha256", key, Buffer.from(CONTEXT), Buffer.from("blob-token"), 32))
}

export function sealBlobToken(token: string, key?: string): SealedBlobToken {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv)
  cipher.setAAD(Buffer.from(CONTEXT))
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  return { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") }
}

export function unsealBlobToken(value: SealedBlobToken, key?: string): string {
  if (value?.version !== 1 || typeof value.iv !== "string" || typeof value.tag !== "string" || typeof value.ciphertext !== "string") throw new Error("Invalid sealed credential")
  const iv = Buffer.from(value.iv, "base64"), tag = Buffer.from(value.tag, "base64")
  if (iv.length !== 12 || tag.length !== 16 || value.ciphertext.length > 4096) throw new Error("Invalid sealed credential")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), iv)
  decipher.setAAD(Buffer.from(CONTEXT)); decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8")
}
