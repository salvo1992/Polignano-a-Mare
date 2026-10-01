import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { getSmoobuQuote } from "@/lib/smoobu-pricing"
import { QuoteError, bookingAmounts } from "@/lib/stay-quote"

export const dynamic = "force-dynamic"
export async function POST(request: Request) {
  try {
    const body = await request.json()
    let roomId = body.roomId
    if (!roomId && body.bookingId) {
      const booking = await getAdminDb().collection("bookings").doc(body.bookingId).get()
      roomId = booking.data()?.roomId
    }
    if (!roomId) throw new QuoteError("Camera mancante", "MISSING_ROOM", 400)
    const quote = await getSmoobuQuote(String(roomId), body.checkIn, body.checkOut)
    const amounts = bookingAmounts(quote.newPrice, quote.nights, Number(body.guests ?? 2), Number(body.numberOfChildren ?? 0), body.pricingContext === "widget" ? "widget" : "booking-page")
    return NextResponse.json({ ...quote, ...amounts }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof QuoteError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error("[Smoobu Price] Quote unavailable", error)
    return NextResponse.json({ error: "Tariffe Smoobu temporaneamente non disponibili. Riprova tra poco.", code: "PRICE_UNAVAILABLE" }, { status: 503 })
  }
}
