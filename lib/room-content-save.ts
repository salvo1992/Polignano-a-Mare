import { roomDraftSchema, MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES, type RoomContent, type RoomId } from "./room-content"

export class RoomContentError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function imageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg"
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return "image/png"
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp"
  return null
}

export interface PhotoUpload { key: string; bytes: Uint8Array; type: string }
export interface RoomSaveDependencies {
  upload: (id: RoomId, photo: PhotoUpload) => Promise<{ src: string; path: string }>
  removeUpload: (path: string) => Promise<void>
  commit: (room: RoomContent, expectedRevision: number) => Promise<void>
}

// Upload first, then atomically publish the ordered gallery. Never delete photos from a saved gallery.
export async function saveRoomContent(current: RoomContent, input: unknown, files: PhotoUpload[], deps: RoomSaveDependencies) {
  const result = roomDraftSchema.safeParse(input)
  if (!result.success) throw new RoomContentError(result.error.issues[0]?.message || "Controlla i campi della camera")
  const draft = result.data
  if (draft.revision !== current.revision) throw new RoomContentError("La camera è stata modificata da un altro amministratore. Ricaricala prima di salvare.", 409)
  const allowed = new Set(current.photos.map(p => p.src))
  const keys = draft.photos.flatMap(p => p.upload ? [p.upload] : [])
  if (new Set(keys).size !== keys.length || new Set(files.map(f => f.key)).size !== files.length || files.length !== keys.length) {
    throw new RoomContentError("Elenco delle foto non valido")
  }
  if (files.reduce((total, f) => total + f.bytes.length, 0) > MAX_UPLOAD_BYTES) {
    throw new RoomContentError("Troppe nuove foto in un solo salvataggio. Aggiungile in più volte.", 413)
  }
  for (const photo of draft.photos) {
    if (photo.src && !allowed.has(photo.src)) throw new RoomContentError("Foto non appartenente alla camera")
    if (photo.upload && !files.some(f => f.key === photo.upload)) throw new RoomContentError("Una foto non è stata ricevuta. Riprova.")
  }
  for (const file of files) {
    if (!keys.includes(file.key) || !file.bytes.length || file.bytes.length > MAX_PHOTO_BYTES || imageType(file.bytes) !== file.type) {
      throw new RoomContentError("Carica solo immagini JPG, PNG o WebP valide, fino a 2 MB dopo l’ottimizzazione.")
    }
  }

  const uploaded: { src: string; path: string; key: string }[] = []
  let commitStarted = false
  try {
    for (const file of files) uploaded.push({ ...(await deps.upload(current.id, file)), key: file.key })
    const room: RoomContent = {
      ...draft, id: current.id, revision: current.revision + 1,
      photos: draft.photos.map(p => ({ src: p.src || uploaded.find(f => f.key === p.upload)!.src, alt: p.alt })),
    }
    commitStarted = true
    await deps.commit(room, current.revision)
    return room
  } catch (error) {
    // An uncertain transaction result may have published the gallery. Keep its files
    // rather than risk breaking saved photos after a network timeout.
    if (!commitStarted || (error instanceof RoomContentError && error.status === 409)) {
      const cleanup = await Promise.allSettled(uploaded.map(file => deps.removeUpload(file.path)))
      if (cleanup.some(result => result.status === "rejected")) console.error("[Rooms] Cleanup of unsaved uploads failed")
    }
    throw error
  }
}
