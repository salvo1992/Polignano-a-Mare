import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendCancellationEmail } from "@/lib/email"
import { calculateCancellationPolicy } from "@/lib/payment-logic"

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

    const cancellationPolicy = calculateCancellationPolicy(checkInDate, booking?.totalAmount || 0, today)

    const refundAmount = cancellationPolicy.refundAmount
    const penalty = cancellationPolicy.penaltyAmount
    const isFullRefund = cancellationPolicy.refundPercentage === 100

    let stripeRefundId = null
    if (refundAmount > 0 && booking?.stripePaymentIntentId) {
      try {
        console.log("[API] Creating Stripe refund for payment intent:", booking.stripePaymentIntentId)
        console.log("[API] Refund amount:", refundAmount / 100, "EUR", `(${cancellationPolicy.refundPercentage}%)`)
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundAmount,
          reason: "requested_by_customer",
        })
        stripeRefundId = refund.id
        console.log("[API] ✅ Stripe refund created successfully:", stripeRefundId)
        console.log("[API] Refund status:", refund.status)
      } catch (error: any) {
        console.error("[API] ❌ Error creating Stripe refund:", error.message)
        // Continue with cancellation even if refund fails
      }
    }

    await bookingRef.update({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      refundAmount,
      penalty,
      refundPercentage: cancellationPolicy.refundPercentage,
      penaltyPercentage: cancellationPolicy.penaltyPercentage,
      stripeRefundId,
      cancellationReason: isFullRefund ? "full_refund" : "late_cancellation",
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (booking?.origin === "site" && booking?.roomId && booking?.checkIn && booking?.checkOut) {
      try {
        console.log("[API] Unblocking dates on Beds24 for cancelled booking")
        const unblockResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/api/beds24/unblock-booking-dates`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: booking.roomId,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
            }),
          },
        )

        if (unblockResponse.ok) {
          console.log("[API] ✅ Dates unblocked on Beds24 successfully")
        } else {
          console.error("[API] ❌ Failed to unblock dates on Beds24:", await unblockResponse.text())
        }
      } catch (error) {
        console.error("[API] ❌ Error unblocking dates on Beds24:", error)
        // Continue with cancellation even if unblock fails
      }
    }

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
        refundAmount,
        penalty,
        isFullRefund,
      })
      console.log("[API] ✅ Cancellation email sent successfully")
    } catch (error) {
      console.error("[API] ❌ Error sending cancellation email:", error)
    }

    console.log("[API] Booking cancelled successfully:", bookingId)

    return NextResponse.json({
      success: true,
      refundAmount,
      penalty,
      refundPercentage: cancellationPolicy.refundPercentage,
      penaltyPercentage: cancellationPolicy.penaltyPercentage,
      isFullRefund,
      stripeRefundId,
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Errore nella cancellazione" }, { status: 500 })
  }
}


