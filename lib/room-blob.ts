import "server-only"
import { randomUUID } from "node:crypto"
import { del, put } from "@vercel/blob"
import { ROOM_BLOB_HOST, ROOM_BLOB_STORE_ID } from "./room-blob-store"
import type { RoomSaveDependencies } from "./room-content-save"

export class RoomBlobError extends Error {
  constructor(message: string, public status = 503) { super(message); this.name = "RoomBlobError" }
}

export function validateRoomBlobToken(value: unknown): string {
  if (typeof value !== "string") throw new RoomBlobError("Inserisci il token dello storage al22suite.", 400)
  const token = value.trim()
  if (token.length > 2048 || !/^vercel_blob_rw_[A-Za-z0-9]+_[A-Za-z0-9_-]+$/.test(token)) {
    throw new RoomBlobError("Incolla soltanto il valore BLOB_READ_WRITE_TOKEN, senza nome della variabile o virgolette.", 400)
  }
  if (`store_${token.split("_")[3]}`.toLowerCase() !== ROOM_BLOB_STORE_ID.toLowerCase()) {
    throw new RoomBlobError("Il token appartiene a un altro archivio. Usa quello dello storage al22suite indicato nel pannello.", 400)
  }
  return token
}

function assertPhotoUrl(src: string, path: string) {
  const url = new URL(src)
  if (url.protocol !== "https:" || url.host !== ROOM_BLOB_HOST || url.pathname !== `/${path}` || url.search || url.hash || url.username || url.password) {
    throw new RoomBlobError("L’archivio non ha restituito una foto pubblica valida. Verifica che lo storage sia pubblico.")
  }
}

// One disposable, non-personal test image. Never inserted into a room's gallery.
const PROBE_IMAGE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=", "base64")

export async function verifyRoomBlobToken(token: string): Promise<void> {
  validateRoomBlobToken(token)
  const path = `al22/storage-check/${randomUUID()}.png`
  let uploaded = false
  try {
    const blob = await put(path, PROBE_IMAGE, { token, access: "public", contentType: "image/png", addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(12_000) })
    uploaded = true
    assertPhotoUrl(blob.url, path)
    const response = await fetch(blob.url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000) })
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("Public read failed")
    const reader = response.body?.getReader()
    if (!reader) throw new Error("Missing probe body")
    const chunks: Uint8Array[] = []; let length = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > PROBE_IMAGE.length) { await reader.cancel(); throw new Error("Unexpected probe body") }
      chunks.push(value)
    }
    if (!Buffer.concat(chunks).equals(PROBE_IMAGE)) throw new Error("Probe mismatch")
  } catch {
    // Do not log SDK errors: provider error text may contain credentials or URLs.
    throw new RoomBlobError("Prova foto su Blob non riuscita. Controlla token, stato dello storage e accesso pubblico. La configurazione precedente non è stata sostituita.")
  } finally {
    if (uploaded) {
      try { await del(path, { token, abortSignal: AbortSignal.timeout(12_000) }) }
      catch { throw new RoomBlobError("Impossibile rimuovere il piccolo file di prova da Blob. Configurazione non aggiornata; riprova tra poco.") }
    }
  }
}

export function createBlobPhotoStorage(token: string): Pick<RoomSaveDependencies, "upload" | "removeUpload"> {
  validateRoomBlobToken(token)
  // Cleanup accepts only files created by this save, never a pathname supplied by a client.
  const created = new Set<string>()
  return {
    upload: async (id, photo) => {
      const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp"
      const path = `al22/rooms/${id}/${randomUUID()}.${extension}`
      try {
        const blob = await put(path, Buffer.from(photo.bytes), { token, access: "public", contentType: photo.type, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000, abortSignal: AbortSignal.timeout(15_000) })
        created.add(path)
        assertPhotoUrl(blob.url, path)
        return { path, src: blob.url }
      } catch {
        if (created.has(path)) {
          try { await del(path, { token, abortSignal: AbortSignal.timeout(10_000) }); created.delete(path) } catch { /* Preserve uncertain uploads; never delete gallery files. */ }
        }
        throw new RoomBlobError("Caricamento foto su Blob non riuscito. Le modifiche restano aperte: riprova o verifica il collegamento dell’archivio.")
      }
    },
    removeUpload: async path => {
      if (!created.has(path)) throw new RoomBlobError("Rimozione foto non consentita.")
      await del(path, { token, abortSignal: AbortSignal.timeout(10_000) })
      created.delete(path)
    },
  }
}
