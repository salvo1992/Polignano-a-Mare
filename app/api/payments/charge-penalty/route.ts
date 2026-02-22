import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

/**
 * POST /api/payments/charge-penalty
 *
 * Charges a penalty amount off-session using the saved PaymentMethod.
 * Body: { bookingId, percent } where percent is 50 or 100
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, percent, description } = await request.json()

    if (!bookingId || !percent) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
      return NextResponse.json(
        { error: "Nessun metodo di pagamento salvato per questa prenotazione" },
        { status: 400 },
      )
    }

    const totalAmountCents = booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100)
    const penaltyAmountCents = Math.round(totalAmountCents * (percent / 100))

    if (penaltyAmountCents <= 0) {
      return NextResponse.json({ error: "Importo penale non valido" }, { status: 400 })
    }

    console.log("[ChargePenalty] Charging:", {
      bookingId,
      percent,
      penaltyAmountCents,
      customerId: booking.stripeCustomerId,
    })

    // Create off-session PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: penaltyAmountCents,
      currency: "eur",
      customer: booking.stripeCustomerId,
      payment_method: booking.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        bookingId,
        type: "penalty",
        percent: String(percent),
      },
      description: description || `Penale ${percent}% - Prenotazione ${bookingId}`,
    })

    // Update booking
    await updateDoc(bookingRef, {
      penaltyAmount: penaltyAmountCents,
      penaltyPercent: percent,
      penaltyPaymentIntentId: paymentIntent.id,
      penaltyStatus: paymentIntent.status,
      updatedAt: serverTimestamp(),
    })

    console.log("[ChargePenalty] Penalty charged:", paymentIntent.id, paymentIntent.status)

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: penaltyAmountCents / 100,
      status: paymentIntent.status,
    })
  } catch (error: any) {
    console.error("[ChargePenalty] Error:", error)
    return NextResponse.json(
      { error: error.message || "Errore nell'addebito della penale" },
      { status: 500 },
    )
  }
}
