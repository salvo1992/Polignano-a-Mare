import { type NextRequest, NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()
  const roomName = String(searchParams.get("roomName") || "").trim()
  const from = String(searchParams.get("from") || "").slice(0, 10)
  const to = String(searchParams.get("to") || "").slice(0, 10)

  if (!roomId || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Parametri di disponibilita non validi." }, { status: 400 })
  }

  try {
    const apartmentId = await smoobuClient.resolveApartmentId(roomId, roomName)
    if (!apartmentId) {
      return NextResponse.json(
        { error: "Camera non associata a Smoobu.", code: "ROOM_NOT_MAPPED" },
        { status: 503 },
      )
    }

    const available = await smoobuClient.checkAvailability(String(apartmentId), from, to)
    return NextResponse.json(
      { available, roomId, apartmentId, from, to },
      { status: available ? 200 : 409, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[Smoobu Availability] Error:", error)
    return NextResponse.json(
      { error: "Smoobu non e raggiungibile. La prenotazione e stata bloccata per sicurezza.", code: "AVAILABILITY_CHECK_FAILED" },
      { status: 503 },
    )
  }
}
