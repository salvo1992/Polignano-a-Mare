import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { syncSmoobuBookings } from "@/lib/smoobu-reconciliation"
import { AdminApiAuthError, requireAdminIdToken } from "@/lib/admin-api-auth"
import { stayDates } from "@/lib/stay-quote"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await requireAdminIdToken(request)
    const body = await request.json()
    const from = body.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = body.to || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    stayDates(from, to)
    return NextResponse.json(await syncSmoobuBookings(from, to, body.source))
  } catch (error) {
    if (error instanceof AdminApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[Smoobu Sync] Failed", error)
    return NextResponse.json({ error: "Sincronizzazione non completata. Nessun blocco viene rilasciato per dati mancanti." }, { status: 503 })
  }
}

export async function GET(request: Request) {
  try {
    await requireAdminIdToken(request)
    const params = new URL(request.url).searchParams
    const source = params.get("source")
    const all = await smoobuClient.getBookings(params.get("from") || undefined, params.get("to") || undefined)
    const bookings = all.filter(booking => !source || source === "all" || booking.referer === source)
    return NextResponse.json({ success: true, bookings, count: bookings.length, source: source || "all" })
  } catch (error) {
    if (error instanceof AdminApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Impossibile leggere Smoobu" }, { status: 503 })
  }
}
