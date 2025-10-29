import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "ID prenotazione mancante" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    const checkInDate = new Date(booking.checkIn)
    const today = new Date()
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const isFullRefund = daysUntilCheckIn >= 7
    const refundAmount = isFullRefund ? booking.totalAmount : 0
    const penalty = isFullRefund ? 0 : booking.totalAmount

    await updateDoc(bookingRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      refundAmount,
      penalty,
      cancellationReason: daysUntilCheckIn >= 7 ? "full_refund" : "late_cancellation",
    })

    // TODO: Process refund through payment gateway if needed

    return NextResponse.json({
      success: true,
      refundAmount,
      penalty,
      isFullRefund,
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Errore nella cancellazione" }, { status: 500 })
  }
}
