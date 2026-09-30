import { NextResponse } from "next/server"
import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import { getStorageDiagnostics } from "@/lib/storage-diagnostics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" }

export async function GET(request: Request) {
  try {
    await requireAdminIdToken(request)
    return NextResponse.json(getStorageDiagnostics(), { headers })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof AdminApiAuthError ? error.message : "Verifica non disponibile. Riprova tra poco.",
    }, { status: error instanceof AdminApiAuthError ? error.status : 503, headers })
  }
}
