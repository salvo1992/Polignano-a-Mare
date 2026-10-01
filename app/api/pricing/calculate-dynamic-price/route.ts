import { NextResponse } from "next/server"
import { getSmoobuQuote } from "@/lib/smoobu-pricing"
import { QuoteError } from "@/lib/stay-quote"

export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()
    const quote = await getSmoobuQuote(String(roomId || ""), checkIn, checkOut)
    return NextResponse.json({
      ...quote, totalPrice: quote.newPrice, averagePerNight: quote.pricePerNight,
      priceBreakdown: quote.nightlyRates.map(rate => ({ ...rate, type: "smoobu" })),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof QuoteError ? error.message : "Tariffa Smoobu non disponibile" }, { status: error instanceof QuoteError ? error.status : 503 })
  }
}


