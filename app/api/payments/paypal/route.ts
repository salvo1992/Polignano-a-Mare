import { type NextRequest, NextResponse } from "next/server"

const PAYPAL_API = process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, amount, currency, successUrl, cancelUrl, metadata } = body

    const accessToken = await getPayPalAccessToken()

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: (amount / 100).toFixed(2),
            },
            description: `Prenotazione #${bookingId}`,
            custom_id: bookingId,
          },
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          brand_name: "Polignano a Mare B&B",
          user_action: "PAY_NOW",
        },
      }),
    })

    const order = await response.json()

    if (!response.ok) {
      throw new Error(order.message || "PayPal order creation failed")
    }

    const approveUrl = order.links.find((link: any) => link.rel === "approve")?.href

    return NextResponse.json({ id: order.id, approveUrl })
  } catch (error) {
    console.error("[v0] PayPal API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment creation failed" },
      { status: 500 },
    )
  }
}

