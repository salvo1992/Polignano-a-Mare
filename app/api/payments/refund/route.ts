import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
})

/**
 * POST /api/payments/refund
 *
 * Processes a partial or full refund via Stripe.
 * Body: { bookingId, amountCents?, reason? }
 * If amountCents is omitted, refunds the full payment.
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, amountCents, reason } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId mancante" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()!

    if (!booking.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Nessun pagamento trovato per questa prenotazione" },
        { status: 400 },
      )
    }

    // Build refund params - Stripe only accepts: duplicate, fraudulent, requested_by_customer
    const validReasons = ["duplicate", "fraudulent", "requested_by_customer"] as const
    const stripeReason = validReasons.includes(reason) ? reason : "requested_by_customer"
    
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: booking.stripePaymentIntentId,
      reason: stripeReason as Stripe.RefundCreateParams["reason"],
    }

    // If a specific amount is provided, do partial refund
    if (amountCents && amountCents > 0) {
      refundParams.amount = amountCents
    }

    console.log("[Refund] Creating refund:", {
      bookingId,
      paymentIntentId: booking.stripePaymentIntentId,
      amountCents: amountCents || "full",
    })

    const refund = await stripe.refunds.create(refundParams)

    // Update booking
    const refundedAmountCents = refund.amount
    await bookingRef.update({
      refundedAmount: refundedAmountCents,
      stripeRefundId: refund.id,
      refundStatus: refund.status,
      status: refundedAmountCents >= (booking.totalAmountCents || 0) ? "refunded" : "partially_refunded",
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("[Refund] Refund created:", refund.id, "amount:", refund.amount, "status:", refund.status)

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      amountCents: refund.amount,
      status: refund.status,
    })
  } catch (error: any) {
    console.error("[Refund] Error:", error)
    return NextResponse.json(
      { error: error.message || "Errore nell'elaborazione del rimborso" },
      { status: 500 },
    )
  }
}
