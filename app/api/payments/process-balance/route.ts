import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

/**
 * POST /api/payments/process-balance
 *
 * Charges the full balance off-session using the saved PaymentMethod.
 * Called by cron 7 days before check-in OR manually from admin.
 *
 * If the payment requires 3D Secure (requires_action), it creates a
 * Checkout Session for manual completion and saves the URL in the booking.
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId mancante" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Already paid
    if (booking.status === "paid") {
      return NextResponse.json({ error: "Saldo gia' pagato" }, { status: 400 })
    }

    // Must have saved payment method and customer
    if (!booking.stripePaymentMethodId || !booking.stripeCustomerId) {
      return NextResponse.json(
        { error: "Metodo di pagamento non trovato. Il cliente deve salvare la carta." },
        { status: 400 },
      )
    }

    const totalAmountCents = booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100)

    if (totalAmountCents <= 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 })
    }

    console.log("[ProcessBalance] Charging off-session:", {
      bookingId,
      amount: totalAmountCents,
      customerId: booking.stripeCustomerId,
      paymentMethodId: booking.stripePaymentMethodId,
    })

    try {
      // Attempt off-session charge
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: "eur",
        customer: booking.stripeCustomerId,
        payment_method: booking.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          bookingId,
          type: "balance_charge",
        },
        description: `Saldo prenotazione ${bookingId}`,
      })

      if (paymentIntent.status === "succeeded") {
        // Payment went through immediately
        await updateDoc(bookingRef, {
          status: "paid",
          stripePaymentIntentId: paymentIntent.id,
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        console.log("[ProcessBalance] Payment succeeded:", paymentIntent.id)

        return NextResponse.json({
          success: true,
          status: "paid",
          paymentIntentId: paymentIntent.id,
        })
      }

      if (paymentIntent.status === "requires_action") {
        // 3D Secure required -- create Checkout Session for manual completion
        console.log("[ProcessBalance] 3D Secure required, creating fallback checkout session")

        const fallbackSession = await stripe.checkout.sessions.create({
          customer: booking.stripeCustomerId,
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Saldo Prenotazione ${bookingId}`,
                  description: "Pagamento saldo richiesto - autenticazione necessaria",
                },
                unit_amount: totalAmountCents,
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/user/booking/${bookingId}?payment=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/user/booking/${bookingId}?payment=pending`,
          metadata: {
            bookingId,
            type: "balance_fallback",
          },
        })

        await updateDoc(bookingRef, {
          status: "payment_action_required",
          paymentUrl: fallbackSession.url,
          updatedAt: serverTimestamp(),
        })

        console.log("[ProcessBalance] Fallback checkout created:", fallbackSession.url)

        return NextResponse.json({
          success: true,
          status: "payment_action_required",
          paymentUrl: fallbackSession.url,
        })
      }

      // Other status
      await updateDoc(bookingRef, {
        status: "payment_pending",
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: `Stato pagamento: ${paymentIntent.status}`,
      })
    } catch (stripeError: any) {
      // If the card was declined or requires authentication
      if (stripeError.code === "authentication_required") {
        console.log("[ProcessBalance] Authentication required, creating fallback session")

        const fallbackSession = await stripe.checkout.sessions.create({
          customer: booking.stripeCustomerId,
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Saldo Prenotazione ${bookingId}`,
                  description: "Pagamento saldo - autenticazione carta richiesta",
                },
                unit_amount: totalAmountCents,
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/user/booking/${bookingId}?payment=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/user/booking/${bookingId}?payment=pending`,
          metadata: {
            bookingId,
            type: "balance_fallback",
          },
        })

        await updateDoc(bookingRef, {
          status: "payment_action_required",
          paymentUrl: fallbackSession.url,
          updatedAt: serverTimestamp(),
        })

        return NextResponse.json({
          success: true,
          status: "payment_action_required",
          paymentUrl: fallbackSession.url,
        })
      }

      // Card declined or other error
      console.error("[ProcessBalance] Payment failed:", stripeError.message)

      await updateDoc(bookingRef, {
        status: "payment_failed",
        paymentError: stripeError.message,
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({
        success: false,
        status: "payment_failed",
        error: stripeError.message,
      })
    }
  } catch (error: any) {
    console.error("[ProcessBalance] Error:", error)
    return NextResponse.json(
      { error: error.message || "Errore nell'elaborazione del saldo" },
      { status: 500 },
    )
  }
}
