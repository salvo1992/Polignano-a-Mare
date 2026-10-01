import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { reconcileSmoobuBooking } from "@/lib/smoobu-reconciliation"

export async function POST(request: Request) {
  try {
    const event = await request.json()
    if (!["newReservation", "updateReservation", "cancelReservation"].includes(event.action)) {
      return NextResponse.json({ success: true, ignored: true })
    }
    const id = String(event.data?.id || "")
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 })
    // Re-read the authenticated provider record, never trust a caller's claimed
    // cancellation. Delayed/out-of-order webhook payloads cannot undo new data.
    const booking = await smoobuClient.getBooking(id)
    await reconcileSmoobuBooking(booking)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Smoobu Webhook] Reconciliation failed", error)
    return NextResponse.json({ error: "Smoobu verification failed; no cancellation inferred" }, { status: 503 })
  }
}

