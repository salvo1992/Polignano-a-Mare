import { NextResponse } from "next/server"
import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import { getRoomContents } from "@/lib/room-content-server"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    await requireAdminIdToken(request)
    return NextResponse.json({ rooms: await getRoomContents() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof AdminApiAuthError ? error.message : "Impossibile caricare le camere. Riprova tra poco." },
      { status: error instanceof AdminApiAuthError ? error.status : 503, headers: { "Cache-Control": "no-store" } })
  }
}
