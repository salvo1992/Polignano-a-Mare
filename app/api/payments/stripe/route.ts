import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

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
 * Creates a Stripe Checkout Session in "setup" mode.
 * This saves the customer's card (SetupIntent with usage: off_session)
 * so the full amount can be charged automatically 7 days before check-in.
 *
 * No money is charged at booking time.
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
      amount, // total amount in cents (for metadata)
      currency,
      bookingId,
      successUrl,
      cancelUrl,
      customerEmail,
    } = body

    if (!amount || !currency || !bookingId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

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

    console.log("[Stripe] Creating SetupIntent checkout session:", {
      amount,
      currency,
      bookingId,
      customerId,
    })

    // Create a Checkout Session in "setup" mode
    // This collects card details without charging
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(bookingId),
      metadata: {
        bookingId: String(bookingId),
        totalAmountCents: String(amount),
        currency: String(currency).toLowerCase(),
      },
      setup_intent_data: {
        usage: "off_session",
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

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      customerId,
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
