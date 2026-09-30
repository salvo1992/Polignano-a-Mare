import { NextResponse } from "next/server"
import { AdminApiAuthError } from "@/lib/admin-api-auth"
import { requireStorageOwner } from "@/lib/storage-owner-auth"
import { getStorageDiagnostics } from "@/lib/storage-diagnostics"
import { getRoomBlobStatus } from "@/lib/room-blob-credentials"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" }

export async function GET(request: Request) {
  try {
    await requireStorageOwner(request)
    return NextResponse.json(getStorageDiagnostics(process.env, await getRoomBlobStatus()), { headers })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof AdminApiAuthError ? error.message : "Verifica non disponibile. Riprova tra poco.",
    }, { status: error instanceof AdminApiAuthError ? error.status : 503, headers })
  }
}
