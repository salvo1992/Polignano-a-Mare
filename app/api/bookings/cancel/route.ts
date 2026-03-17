import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import Stripe from "stripe"
import { sendCancellationEmail } from "@/lib/email"
import { calculateCancellationPolicy } from "@/lib/payment-logic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"

// Support both DELETE and POST methods
async function handleCancellation(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[Cancel] Body parse error:", parseError)
      return NextResponse.json({ error: "Dati richiesta non validi" }, { status: 400 })
    }
    
    const { bookingId, userId } = body

    if (!bookingId) {
      console.error("[Cancel] Missing bookingId in request body:", body)
      return NextResponse.json({ error: "ID prenotazione mancante" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Verify ownership
    if (userId && booking.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const checkInDate = new Date(booking.checkIn)
    const today = new Date()

    // Cannot cancel past bookings
    if (checkInDate < today) {
      return NextResponse.json({ error: "Non puoi cancellare prenotazioni passate" }, { status: 400 })
    }

    // Get total amount in cents
    const totalAmountCents = booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100)

    // Calculate penalty: >7 days = 0%, <=7 days = 100%
    const policy = calculateCancellationPolicy(checkInDate, totalAmountCents, today)

    console.log("[Cancel] Policy:", {
      bookingId,
      daysLeft: Math.floor((checkInDate.getTime() - today.getTime()) / 86400000),
      penaltyPercent: policy.penaltyPercent,
      refundPercent: policy.refundPercent,
      totalAmountCents,
      isPaid: booking.status === "paid",
    })

    // CASE 1: Booking is already paid
    if (booking.status === "paid" && booking.stripePaymentIntentId) {
      if (policy.refundPercent === 100) {
        // >7 days: full refund
        try {
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripePaymentIntentId,
            amount: totalAmountCents,
            reason: "requested_by_customer",
          })

          console.log("[Cancel] Full refund created:", refund.id)

          await updateDoc(bookingRef, {
            status: "cancelled",
            cancelledAt: serverTimestamp(),
            penaltyApplied: 0,
            refundAmount: totalAmountCents,
            stripeRefundId: refund.id,
            updatedAt: serverTimestamp(),
          })
        } catch (refundError: any) {
          console.error("[Cancel] Refund error:", refundError.message)
          // Still cancel but mark refund as pending
          await updateDoc(bookingRef, {
            status: "cancelled",
            cancelledAt: serverTimestamp(),
            penaltyApplied: 0,
            pendingRefund: {
              amount: totalAmountCents,
              reason: "refund_api_failed",
              error: refundError.message,
            },
            updatedAt: serverTimestamp(),
          })
        }
      } else {
        // <=7 days: no refund (100% penalty)
        console.log("[Cancel] Late cancellation - no refund, 100% penalty")

        await updateDoc(bookingRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          penaltyApplied: 100,
          refundAmount: 0,
          updatedAt: serverTimestamp(),
        })
      }
    }
    // CASE 2: Booking NOT paid yet
    else if (policy.penaltyPercent === 100 && booking.stripePaymentMethodId && booking.stripeCustomerId) {
      // <=7 days, not paid: charge 100% penalty off-session
      console.log("[Cancel] Charging 100% penalty off-session:", totalAmountCents)

      try {
        const penaltyIntent = await stripe.paymentIntents.create({
          amount: totalAmountCents,
          currency: "eur",
          customer: booking.stripeCustomerId,
          payment_method: booking.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            bookingId,
            type: "cancellation_penalty",
          },
          description: `Penale cancellazione tardiva - Prenotazione ${bookingId}`,
        })

        await updateDoc(bookingRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          penaltyApplied: 100,
          penaltyPaymentIntentId: penaltyIntent.id,
          penaltyAmount: totalAmountCents,
          updatedAt: serverTimestamp(),
        })

        console.log("[Cancel] Penalty charged:", penaltyIntent.id)
      } catch (penaltyError: any) {
        console.error("[Cancel] Penalty charge failed:", penaltyError.message)
        // Cancel anyway, mark penalty as failed
        await updateDoc(bookingRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          penaltyApplied: 100,
          penaltyFailed: true,
          penaltyError: penaltyError.message,
          updatedAt: serverTimestamp(),
        })
      }
    } else {
      // >7 days, not paid: just cancel, no penalty
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        penaltyApplied: 0,
        updatedAt: serverTimestamp(),
      })
    }

    // Unblock Smoobu dates
    if (booking.roomId && booking.checkIn && booking.checkOut) {
      try {
        await fetch(`${siteUrl}/api/smoobu/unblock-booking-dates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: booking.roomId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          }),
        })
        console.log("[Cancel] Smoobu dates unblocked")
      } catch (smoobuError) {
        console.error("[Cancel] Smoobu unblock error:", smoobuError)
      }
    }

    // Send cancellation emails
    const emailData = {
      to: booking.email || "",
      bookingId,
      firstName: booking.firstName || "",
      lastName: booking.lastName || "",
      roomName: booking.roomName || "",
      checkIn: booking.checkIn || "",
      checkOut: booking.checkOut || "",
      guests: booking.guests || 1,
      originalAmount: booking.totalAmount || 0,
      refundAmount: policy.refundAmount / 100,
      penalty: policy.penaltyAmount / 100,
      isFullRefund: policy.refundPercent === 100,
      manualRefund: false,
    }

    try {
      await sendCancellationEmail(emailData)
      // Also notify management
      await sendCancellationEmail({
        ...emailData,
        to: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "info@al22suite.com",
      })
    } catch (emailError) {
      console.error("[Cancel] Email error:", emailError)
    }

    return NextResponse.json({
      success: true,
      penaltyPercent: policy.penaltyPercent,
      refundPercent: policy.refundPercent,
      refundAmount: policy.refundAmount / 100,
      penaltyAmount: policy.penaltyAmount / 100,
      message:
        policy.refundPercent > 0
          ? `Prenotazione cancellata. Rimborso di EUR${(policy.refundAmount / 100).toFixed(2)} in corso.`
          : "Prenotazione cancellata. Penale del 100% applicata per cancellazione tardiva.",
    })
  } catch (error: any) {
    console.error("[Cancel] Error:", error)
    return NextResponse.json({ error: "Errore nella cancellazione" }, { status: 500 })
  }
}

// Export both DELETE and POST handlers
export async function DELETE(request: NextRequest) {
  return handleCancellation(request)
}

export async function POST(request: NextRequest) {
  return handleCancellation(request)
}
