// Public identifiers only. Never put a read-write token in this file.
export const ROOM_BLOB_STORE_ID = "store_XCl7resVDboCUh6e"
export const ROOM_BLOB_HOST = "xcl7resvdbocuh6e.public.blob.vercel-storage.com"
export const ROOM_BLOB_GUIDE_URL = "https://vercel.com/ekobitsrl-4449s-projects/~/stores/blob/store_XCl7resVDboCUh6e/guides"

export interface RoomBlobStatus {
  configured: boolean
  storeId: string
  verifiedAt: string | null
}
