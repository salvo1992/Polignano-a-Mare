import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID mancante" }, { status: 400 })
    }

    console.log("[API] Processing Stripe session:", sessionId)

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento non completato" }, { status: 400 })
    }

    const metadata = session.metadata
    if (!metadata || !metadata.bookingId) {
      return NextResponse.json({ error: "Metadati sessione mancanti" }, { status: 400 })
    }

    console.log("[API] Session metadata:", metadata)

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(metadata.bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Update booking based on modification type
    if (metadata.type === "change_dates") {
      const newTotalAmount = Number.parseInt(metadata.newPrice)
      const penalty = Number.parseInt(metadata.penalty || "0")
      const originalAmount = Number.parseInt(metadata.originalAmount)
      const dateChangeCost = Number.parseInt(metadata.dateChangeCost)

      console.log("[API] Updating booking with new dates:", {
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        newTotalAmount,
        penalty,
      })

      await bookingRef.update({
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
        totalAmount: newTotalAmount,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Send modification email
      await sendModificationEmail({
        to: booking?.email,
        bookingId: metadata.bookingId,
        firstName: booking?.firstName,
        lastName: booking?.lastName,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        roomName: booking?.roomName,
        guests: booking?.guests || 2,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
        originalAmount,
        newAmount: newTotalAmount,
        penalty,
        dateChangeCost,
        modificationType: "dates",
      })

      console.log("[API] ✅ Booking dates updated and email sent")
    } else if (metadata.type === "add_guest") {
      const newGuestsCount = Number.parseInt(metadata.newGuestsCount)
      const newTotalAmount = Number.parseInt(metadata.newTotalAmount)
      const originalAmount = Number.parseInt(metadata.originalAmount)
      const guestAdditionCost = Number.parseInt(metadata.guestAdditionCost)

      console.log("[API] Updating booking with new guests:", {
        newGuestsCount,
        newTotalAmount,
      })

      await bookingRef.update({
        guests: newGuestsCount,
        totalAmount: newTotalAmount,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Send modification email
      const nights = calculateNights(booking?.checkIn, booking?.checkOut)
      await sendModificationEmail({
        to: booking?.email,
        bookingId: metadata.bookingId,
        firstName: booking?.firstName,
        lastName: booking?.lastName,
        checkIn: booking?.checkIn,
        checkOut: booking?.checkOut,
        roomName: booking?.roomName,
        guests: newGuestsCount,
        nights,
        originalAmount,
        newAmount: newTotalAmount,
        guestAdditionCost,
        modificationType: "guests",
      })

      console.log("[API] ✅ Booking guests updated and email sent")
    }

    // Get updated booking data
    const updatedBookingSnap = await bookingRef.get()
    const updatedBooking = updatedBookingSnap.data()

    return NextResponse.json({
      success: true,
      booking: {
        id: metadata.bookingId,
        ...updatedBooking,
      },
    })
  } catch (error: any) {
    console.error("[API] Error processing session:", error)
    return NextResponse.json({ error: error.message || "Errore nell'elaborazione" }, { status: 500 })
  }
}
