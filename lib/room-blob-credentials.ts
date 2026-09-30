import "server-only"
import { getAdminDb } from "@/lib/firebase-admin"
import { sealBlobToken, unsealBlobToken, type SealedBlobToken } from "./blob-credential-seal"
import { RoomBlobError, validateRoomBlobToken, verifyRoomBlobToken } from "./room-blob"
import { ROOM_BLOB_STORE_ID, type RoomBlobStatus } from "./room-blob-store"

function configRef() { return getAdminDb().collection("server_credentials").doc("room_blob") }

export async function getRoomBlobCredentials(): Promise<{ token: string; verifiedAt: string } | null> {
  try {
    const snapshot = await configRef().get()
    if (!snapshot.exists) return null
    const data = snapshot.data()!
    if (data.storeId !== ROOM_BLOB_STORE_ID || typeof data.verifiedAt !== "string") throw new Error("Invalid stored config")
    const token = validateRoomBlobToken(unsealBlobToken(data.sealedToken as SealedBlobToken))
    return { token, verifiedAt: data.verifiedAt }
  } catch {
    // Fail closed: a broken config must not silently switch uploads to another provider.
    throw new RoomBlobError("Configurazione foto non leggibile. Ricollega il token Blob dal pannello admin o riprova tra poco.")
  }
}

export async function getRoomBlobStatus(): Promise<RoomBlobStatus> {
  const credentials = await getRoomBlobCredentials()
  return { configured: Boolean(credentials), storeId: ROOM_BLOB_STORE_ID, verifiedAt: credentials?.verifiedAt ?? null }
}

export async function configureRoomBlob(value: unknown, uid: string): Promise<RoomBlobStatus> {
  const token = validateRoomBlobToken(value)
  let sealedToken: SealedBlobToken
  try { sealedToken = sealBlobToken(token) }
  catch { throw new RoomBlobError("Protezione del token non disponibile sul server. Configurazione non salvata.") }
  await verifyRoomBlobToken(token)
  const verifiedAt = new Date().toISOString()
  try {
    await configRef().set({ storeId: ROOM_BLOB_STORE_ID, sealedToken, verifiedAt, updatedBy: uid })
  } catch { throw new RoomBlobError("Blob risponde, ma il salvataggio della configurazione non è confermato. Ricarica lo stato prima di riprovare.") }
  return { configured: true, storeId: ROOM_BLOB_STORE_ID, verifiedAt }
}

export async function recheckRoomBlob(): Promise<RoomBlobStatus> {
  const credentials = await getRoomBlobCredentials()
  if (!credentials) throw new RoomBlobError("Collega prima il token dello storage.", 400)
  await verifyRoomBlobToken(credentials.token)
  // A check does not overwrite a token another admin may have replaced meanwhile.
  return { configured: true, storeId: ROOM_BLOB_STORE_ID, verifiedAt: new Date().toISOString() }
}
