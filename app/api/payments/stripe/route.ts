import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { smoobuClient } from "@/lib/smoobu-client"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error("[Stripe] STRIPE_SECRET_KEY is not set")
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" })
  : null

/**
 * POST /api/payments/stripe
 *
 * Creates a Stripe Checkout Session.
 * - If check-in is <= 7 days away: "payment" mode (charges immediately)
 * - If check-in is > 7 days away: "setup" mode (saves card for later charge)
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe non e' configurato correttamente. Contatta il supporto." },
        { status: 500 },
      )
    }

    const body = await request.json()
    const {
      amount: submittedAmount,
      currency: submittedCurrency,
      bookingId,
      successUrl,
      cancelUrl,
      customerEmail: submittedCustomerEmail,
      checkInDate: submittedCheckInDate,
    } = body

    if (!submittedAmount || !submittedCurrency || !bookingId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(String(bookingId))
    const bookingSnapshot = await bookingRef.get()
    if (!bookingSnapshot.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnapshot.data()!
    const holdExpiresAt = booking.holdExpiresAt?.toMillis?.() || new Date(booking.holdExpiresAt || 0).getTime()
    if (booking.status === "pending" && holdExpiresAt && holdExpiresAt <= Date.now()) {
      return NextResponse.json(
        { error: "La selezione delle date e scaduta. Torna alla pagina di prenotazione e riprova." },
        { status: 409 },
      )
    }

    const apartmentId = Number(booking.smoobuApartmentId) ||
      await smoobuClient.resolveApartmentId(String(booking.roomId || ""), String(booking.roomName || ""))
    if (!apartmentId) {
      return NextResponse.json({ error: "Camera non associata a Smoobu" }, { status: 503 })
    }

    try {
      const available = await smoobuClient.checkAvailability(
        String(apartmentId),
        String(booking.checkIn).slice(0, 10),
        String(booking.checkOut).slice(0, 10),
      )
      if (!available) {
        await bookingRef.update({ status: "availability_conflict", updatedAt: new Date() })
        return NextResponse.json(
          { error: "Le date non sono piu disponibili. Il pagamento non e stato avviato." },
          { status: 409 },
        )
      }
    } catch (error) {
      console.error("[Stripe] Smoobu recheck failed:", error)
      return NextResponse.json(
        { error: "Disponibilita non verificabile. Il pagamento non e stato avviato." },
        { status: 503 },
      )
    }

    // Never trust price or guest identity sent by the browser.
    const amount = Number(booking.totalAmountCents || Math.round(Number(booking.totalAmount) * 100))
    const currency = String(booking.currency || submittedCurrency || "EUR")
    const customerEmail = String(booking.email || submittedCustomerEmail || "")
    const checkInDate = String(booking.checkIn || submittedCheckInDate || "")
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Importo prenotazione non valido" }, { status: 400 })
    }

    // Calculate days until check-in to determine payment mode
    let daysUntilCheckIn = 999 // Default to far future (setup mode)
    if (checkInDate) {
      const checkIn = new Date(checkInDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      checkIn.setHours(0, 0, 0, 0)
      daysUntilCheckIn = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    // If <= 7 days until check-in, charge immediately
    const shouldChargeImmediately = daysUntilCheckIn <= 7

    // Find or create Stripe customer
    let customerId: string | undefined
    if (customerEmail) {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        const newCustomer = await stripe.customers.create({
          email: customerEmail,
          metadata: { bookingId: String(bookingId) },
        })
        customerId = newCustomer.id
      }
    }

    console.log("[Stripe] Creating checkout session:", {
      amount,
      currency,
      bookingId,
      customerId,
      daysUntilCheckIn,
      mode: shouldChargeImmediately ? "payment" : "setup",
    })

    let session
    
    if (shouldChargeImmediately) {
      // PAYMENT MODE: Check-in is within 7 days, charge the full amount now
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: String(bookingId),
        metadata: {
          bookingId: String(bookingId),
          totalAmountCents: String(amount),
          currency: String(currency).toLowerCase(),
          chargeType: "immediate_full_payment",
        },
        line_items: [
          {
            price_data: {
              currency: String(currency).toLowerCase(),
              product_data: {
                name: "Prenotazione AL 22 Suite & Spa",
                description: `Soggiorno completo - Check-in entro 7 giorni`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            bookingId: String(bookingId),
            chargeType: "immediate_full_payment",
          },
          setup_future_usage: "off_session", // Still save the card for potential changes/refunds
        },
        payment_method_types: ["card"],
        locale: "it",
        billing_address_collection: "required",
      })
    } else {
      // SETUP MODE: Check-in is more than 7 days away, just save the card
      session = await stripe.checkout.sessions.create({
        mode: "setup",
        customer: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: String(bookingId),
        metadata: {
          bookingId: String(bookingId),
          totalAmountCents: String(amount),
          currency: String(currency).toLowerCase(),
          chargeType: "setup_for_later",
        },
        setup_intent_data: {
          metadata: {
            bookingId: String(bookingId),
            totalAmountCents: String(amount),
            currency: String(currency).toLowerCase(),
          },
        },
        payment_method_types: ["card"],
        locale: "it",
        billing_address_collection: "required",
      })
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      customerId,
      mode: shouldChargeImmediately ? "payment" : "setup",
      daysUntilCheckIn,
      chargedImmediately: shouldChargeImmediately,
    })
  } catch (error: any) {
    console.error("[Stripe] API route error:", error)

    if (error.type === "StripeAuthenticationError") {
      return NextResponse.json(
        { error: "Chiave API Stripe non valida. Verifica la configurazione." },
        { status: 401 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Errore durante la creazione della sessione Stripe" },
      { status: 500 },
    )
  }
}
