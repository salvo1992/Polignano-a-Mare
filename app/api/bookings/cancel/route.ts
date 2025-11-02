import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendCancellationEmail } from "@/lib/email"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })

export async function DELETE(request: NextRequest) {
  try {
    const { bookingId, userId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "ID prenotazione mancante" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Verify user owns this booking
    if (userId && booking?.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const checkInDate = new Date(booking?.checkIn || "")
    const today = new Date()
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Check if booking can be cancelled (not in the past)
    if (daysUntilCheckIn < 0) {
      return NextResponse.json({ error: "Non puoi cancellare prenotazioni passate" }, { status: 400 })
    }

    const isFullRefund = daysUntilCheckIn >= 7
    const penalty = isFullRefund ? 0 : Math.round((booking?.totalAmount || 0) * 0.5)
    const refundAmount = isFullRefund ? booking?.totalAmount || 0 : 0

    let stripeRefundId = null
    if (isFullRefund && booking?.stripePaymentIntentId && refundAmount > 0) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundAmount,
          reason: "requested_by_customer",
        })
        stripeRefundId = refund.id
        console.log("[API] Stripe refund created:", stripeRefundId, "Amount:", refundAmount / 100)
      } catch (error) {
        console.error("[API] Error creating Stripe refund:", error)
        return NextResponse.json({ error: "Errore nel processare il rimborso" }, { status: 500 })
      }
    }

    await bookingRef.update({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      refundAmount,
      penalty,
      stripeRefundId,
      cancellationReason: isFullRefund ? "full_refund" : "late_cancellation",
      updatedAt: FieldValue.serverTimestamp(),
    })

    try {
      await sendCancellationEmail({
        to: booking?.email || "",
        bookingId,
        firstName: booking?.firstName || "",
        lastName: booking?.lastName || "",
        roomName: booking?.roomName || "",
        checkIn: booking?.checkIn || "",
        checkOut: booking?.checkOut || "",
        guests: booking?.guests || 1,
        originalAmount: booking?.totalAmount || 0,
        penalty,
        refundAmount,
        isFullRefund,
      })
    } catch (error) {
      console.error("[API] Error sending cancellation email:", error)
    }

    console.log("[API] Booking cancelled successfully:", bookingId)

    return NextResponse.json({
      success: true,
      refundAmount,
      penalty,
      isFullRefund,
      stripeRefundId,
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Errore nella cancellazione" }, { status: 500 })
  }
}

