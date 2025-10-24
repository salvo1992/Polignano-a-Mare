import { type NextRequest, NextResponse } from "next/server"

const UNICREDIT_API =
  process.env.UNICREDIT_MODE === "live" ? "https://api.unicredit.eu" : "https://sandbox.api.unicredit.eu"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bookingId, amount, currency, successUrl, cancelUrl, customerEmail, metadata } = body

    const response = await fetch(`${UNICREDIT_API}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.UNICREDIT_API_KEY}`,
        "X-Merchant-ID": process.env.UNICREDIT_MERCHANT_ID || "",
      },
      body: JSON.stringify({
        amount: {
          value: amount,
          currency: currency,
        },
        description: `Prenotazione B&B #${bookingId}`,
        reference: bookingId,
        customer: {
          email: customerEmail,
        },
        redirect_urls: {
          success: successUrl,
          cancel: cancelUrl,
        },
        metadata: {
          bookingId,
          ...metadata,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || "UniCredit payment creation failed")
    }

    return NextResponse.json({
      redirectUrl: data.redirect_url || data.payment_url,
      id: data.id || data.payment_id,
    })
  } catch (error) {
    console.error("[v0] UniCredit API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment creation failed" },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID missing" }, { status: 400 })
    }

    const response = await fetch(`${UNICREDIT_API}/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.UNICREDIT_API_KEY}`,
        "X-Merchant-ID": process.env.UNICREDIT_MERCHANT_ID || "",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to verify payment")
    }

    const paymentData = await response.json()

    return NextResponse.json({
      status: paymentData.status,
      paymentId: paymentId,
    })
  } catch (error) {
    console.error("UniCredit payment verification error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}


