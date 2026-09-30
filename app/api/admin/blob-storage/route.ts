import { NextResponse } from "next/server"
import { AdminApiAuthError } from "@/lib/admin-api-auth"
import { requireStorageOwner } from "@/lib/storage-owner-auth"
import { configureRoomBlob, getRoomBlobStatus, recheckRoomBlob } from "@/lib/room-blob-credentials"
import { RoomBlobError } from "@/lib/room-blob"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" }

function failure(error: unknown) {
  const known = error instanceof AdminApiAuthError || error instanceof RoomBlobError
  return NextResponse.json({ error: known ? error.message : "Operazione non riuscita. Riprova tra poco." }, { status: known ? error.status : 503, headers })
}

async function readInput(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new RoomBlobError("Formato non valido.", 400)
  const reader = request.body?.getReader()
  if (!reader) throw new RoomBlobError("Dati mancanti.", 400)
  const chunks: Uint8Array[] = []; let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 4096) { await reader.cancel(); throw new RoomBlobError("Richiesta troppo grande.", 413) }
    chunks.push(value)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown }
  catch { throw new RoomBlobError("Dati non validi.", 400) }
}

export async function GET(request: Request) {
  try { await requireStorageOwner(request); return NextResponse.json(await getRoomBlobStatus(), { headers }) }
  catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  try {
    const uid = await requireStorageOwner(request)
    const body = await readInput(request)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RoomBlobError("Dati non validi.", 400)
    const input = body as { action?: unknown; token?: unknown }
    if (input.action === "connect") return NextResponse.json(await configureRoomBlob(input.token, uid), { headers })
    if (input.action === "verify") return NextResponse.json(await recheckRoomBlob(), { headers })
    throw new RoomBlobError("Operazione non valida.", 400)
  } catch (error) { return failure(error) }
}
