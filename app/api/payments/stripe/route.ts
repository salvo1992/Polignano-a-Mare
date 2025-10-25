import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error("[v0] STRIPE_SECRET_KEY is not set in environment variables")
}

if (stripeSecretKey && !stripeSecretKey.startsWith("sk_")) {
  console.error("[v0] STRIPE_SECRET_KEY appears to be invalid (should start with sk_test_ or sk_live_)")
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    })
  : null
// </CHANGE>

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe non è configurato correttamente. Contatta il supporto." },
        { status: 500 },
      )
    }
    // </CHANGE>

    const body = await request.json()
    const { amount, currency, bookingId, successUrl, cancelUrl } = body

    if (!amount || !currency || !bookingId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    console.log("[v0] Creating Stripe session with amount (in cents):", amount)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        "card",
        "klarna",
        "paypal",
        "link",
        "bancontact",
        "eps",
        "giropay",
        "ideal",
        "p24",
        "sofort",
      ],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: "Prenotazione Camera",
              description: `Prenotazione #${bookingId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
      },
      locale: "it",
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      // </CHANGE>
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("[v0] Stripe API route error:", error)

    if (error.type === "StripeAuthenticationError") {
      return NextResponse.json({ error: "Chiave API Stripe non valida. Verifica la configurazione." }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || "Errore durante la creazione del pagamento Stripe" },
      { status: 500 },
    )
  }
}
