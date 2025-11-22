import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, reason } = await request.json()

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingDoc = await db.collection("bookings").doc(bookingId).get()

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingDoc.data()

    if (!booking.stripePaymentIntentId) {
      return NextResponse.json({ error: "No payment intent found for this booking" }, { status: 400 })
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: reason || "requested_by_customer",
    })

    // Update booking in database
    await db
      .collection("bookings")
      .doc(bookingId)
      .update({
        refundAmount: FieldValue.increment(amount * 100),
        stripeRefundId: refund.id,
        refundStatus: refund.status,
        updatedAt: FieldValue.serverTimestamp(),
      })

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    })
  } catch (error: any) {
    console.error("Error processing refund:", error)
    return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 })
  }
}
