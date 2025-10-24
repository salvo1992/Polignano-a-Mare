import { type NextRequest, NextResponse } from "next/server"

const SATISPAY_API =
  process.env.SATISPAY_MODE === "live"
    ? "https://authservices.satispay.com"
    : "https://staging.authservices.satispay.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, amount, currency, successUrl, cancelUrl, metadata } = body

    const response = await fetch(`${SATISPAY_API}/g_business/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SATISPAY_API_KEY}`,
      },
      body: JSON.stringify({
        flow: "MATCH_CODE",
        amount_unit: amount,
        currency,
        callback_url: successUrl,
        external_code: bookingId,
        metadata: {
          bookingId,
          ...metadata,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Satispay payment creation failed")
    }

    return NextResponse.json({
      redirectUrl: data.redirect_url || successUrl,
      id: data.id,
    })
  } catch (error) {
    console.error("[v0] Satispay API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment creation failed" },
      { status: 500 },
    )
  }
}


