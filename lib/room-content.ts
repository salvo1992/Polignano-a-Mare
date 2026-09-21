import { z } from "zod"
import { ROOMS } from "./rooms-data"
import { initialDescriptions, initialPhotoGalleries } from "./room-content-defaults"

export const MAX_ROOM_PHOTOS = 30
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
export const ROOM_IDS = ["1", "2"] as const
export type RoomId = (typeof ROOM_IDS)[number]

const text = (max: number) => z.string().trim().max(max)
const fields = {
  name: text(120).min(1, "Inserisci il nome della camera"),
  description: text(1200).min(1, "Inserisci una descrizione"),
  longDescription: text(10000),
  beds: z.number().int().min(1).max(10),
  bathrooms: z.number().int().min(1).max(10),
  size: z.number().positive().max(1000),
  amenities: z.array(text(100).min(1)).max(40),
}
export const photoSchema = z.object({ src: text(2048).min(1), alt: text(160) }).strict()
export const roomContentSchema = z.object({
  ...fields,
  revision: z.number().int().nonnegative(),
  photos: z.array(photoSchema).min(1, "Mantieni almeno una foto").max(MAX_ROOM_PHOTOS),
}).strict()
export const roomDraftSchema = z.object({
  ...fields,
  revision: z.number().int().nonnegative(),
  photos: z.array(z.object({
    src: text(2048).min(1).optional(),
    upload: z.string().regex(/^photo-[a-zA-Z0-9-]+$/).optional(),
    alt: text(160),
  }).strict().refine(p => Boolean(p.src) !== Boolean(p.upload), "Foto non valida"))
    .min(1, "Mantieni almeno una foto").max(MAX_ROOM_PHOTOS),
}).strict()

export type RoomContent = z.infer<typeof roomContentSchema> & { id: RoomId }
export type RoomDraft = z.infer<typeof roomDraftSchema>
export type RoomPhoto = z.infer<typeof photoSchema>

export function isRoomId(id: string): id is RoomId {
  return ROOM_IDS.includes(id as RoomId)
}

export const DEFAULT_ROOM_CONTENT: RoomContent[] = ROOMS.map(room => ({
  id: room.id,
  revision: 0,
  name: room.name,
  description: initialDescriptions[room.id],
  longDescription: initialDescriptions[room.id],
  beds: room.beds,
  bathrooms: room.bathrooms,
  size: room.size,
  amenities: [...room.amenities],
  photos: initialPhotoGalleries[room.id].map(photo => ({ ...photo })),
}))

export function resolveRoomContent(id: RoomId, stored: unknown): RoomContent {
  const parsed = roomContentSchema.safeParse(stored)
  return parsed.success ? { ...parsed.data, id } : DEFAULT_ROOM_CONTENT.find(room => room.id === id)!
}

export function withRoomContent(content: RoomContent) {
  const original = ROOMS.find(room => room.id === content.id)!
  return { ...original, ...content, images: content.photos.map(photo => photo.src), available: true }
}
