import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { admin, getAdminDb } from "@/lib/firebase-admin"
import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import { isRoomId, resolveRoomContent } from "@/lib/room-content"
import { ROOMS } from "@/lib/rooms-data"
import { RoomContentError, saveRoomContent, type PhotoUpload } from "@/lib/room-content-save"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function readForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new RoomContentError("Formato del salvataggio non valido")
  const limit = 4 * 1024 * 1024
  if (Number(request.headers.get("content-length")) > limit) throw new RoomContentError("Salva le nuove foto in più volte", 413)
  const reader = request.body?.getReader()
  if (!reader) throw new RoomContentError("Dati mancanti")
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > limit) { await reader.cancel(); throw new RoomContentError("Salva le nuove foto in più volte", 413) }
    chunks.push(value)
  }
  try {
    return await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData()
  } catch { throw new RoomContentError("Dati del modulo non validi") }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const uid = await requireAdminIdToken(request)
    if (!isRoomId(params.id)) throw new RoomContentError("Camera non trovata", 404)
    const form = await readForm(request)
    let input: unknown
    try { input = JSON.parse(String(form.get("room"))) } catch { throw new RoomContentError("Dati camera non validi") }
    const files: PhotoUpload[] = []
    for (const [key, value] of form.entries()) {
      if (key === "room") continue
      if (typeof value === "string") throw new RoomContentError("Foto non valida")
      files.push({ key, bytes: new Uint8Array(await value.arrayBuffer()), type: value.type })
    }
    const db = getAdminDb()
    const ref = db.collection("rooms").doc(params.id)
    const snapshot = await ref.get()
    const current = resolveRoomContent(params.id, snapshot.data()?.content)
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (files.length && !bucketName) throw new RoomContentError("Il caricamento foto non è ancora configurato. Contatta chi gestisce il sito.", 503)
    const room = await saveRoomContent(current, input, files, {
      upload: async (id, photo) => {
        const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp"
        const path = `rooms/${id}/${randomUUID()}.${extension}`
        const token = randomUUID()
        await admin.storage().bucket(bucketName!).file(path).save(Buffer.from(photo.bytes), {
          resumable: false,
          metadata: { contentType: photo.type, cacheControl: "public, max-age=31536000, immutable", metadata: { firebaseStorageDownloadTokens: token } },
        })
        return { path, src: `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName!)}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }
      },
      removeUpload: async path => { await admin.storage().bucket(bucketName!).file(path).delete({ ignoreNotFound: true }) },
      commit: async (content, expectedRevision) => {
        await db.runTransaction(async transaction => {
          const latest = await transaction.get(ref)
          const latestContent = resolveRoomContent(current.id, latest.data()?.content)
          if (latestContent.revision !== expectedRevision) throw new RoomContentError("Un altro amministratore ha salvato questa camera. Ricaricala per vedere gli aggiornamenti.", 409)
          const { id, ...stored } = content
          const defaults = ROOMS.find(room => room.id === id)!
          transaction.set(ref, { ...(!latest.exists ? { price: defaults.price, capacity: defaults.guests, status: "available" } : {}),
            content: stored, name: content.name, description: content.description, amenities: content.amenities,
            beds: content.beds, bathrooms: content.bathrooms, size: content.size, images: content.photos.map(photo => photo.src),
            contentUpdatedBy: uid, contentUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
        })
      },
    })
    return NextResponse.json({ room }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const known = error instanceof AdminApiAuthError || error instanceof RoomContentError
    if (!known) console.error("[Rooms] Save failed", error instanceof Error ? error.name : "Unknown error")
    return NextResponse.json({ error: known ? error.message : "Salvataggio non riuscito. Le modifiche restano aperte: riprova." },
      { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } })
  }
}
