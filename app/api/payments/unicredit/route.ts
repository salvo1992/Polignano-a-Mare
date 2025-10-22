import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bookingId, amount, currency, successUrl, cancelUrl, customerEmail } = body

    // UniCredit payment integration
    // Replace with actual UniCredit API credentials and endpoints
    const unicreditApiKey = process.env.UNICREDIT_API_KEY
    const unicreditMerchantId = process.env.UNICREDIT_MERCHANT_ID

    if (!unicreditApiKey || !unicreditMerchantId) {
      return NextResponse.json({ error: "UniCredit credentials not configured" }, { status: 500 })
    }

    // Create payment request to UniCredit
    const paymentRequest = {
      merchantId: unicreditMerchantId,
      amount: amount, // in cents
      currency: currency,
      orderId: bookingId,
      returnUrl: successUrl,
      cancelUrl: cancelUrl,
      customerEmail: customerEmail,
    }

    // Call UniCredit API (replace with actual endpoint)
    const response = await fetch("https://api.unicredit.it/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unicreditApiKey}`,
      },
      body: JSON.stringify(paymentRequest),
    })

    if (!response.ok) {
      throw new Error("UniCredit payment creation failed")
    }

    const data = await response.json()

    return NextResponse.json({
      redirectUrl: data.paymentUrl,
      id: data.paymentId,
    })
  } catch (error) {
    console.error("UniCredit payment error:", error)
    return NextResponse.json({ error: "Failed to create UniCredit payment" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const paymentId = searchParams.get("paymentId")
    const status = searchParams.get("status")

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID missing" }, { status: 400 })
    }

    // Verify payment status with UniCredit
    const unicreditApiKey = process.env.UNICREDIT_API_KEY
    const response = await fetch(`https://api.unicredit.it/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${unicreditApiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to verify payment")
    }

    const paymentData = await response.json()

    return NextResponse.json({
      status: paymentData.status, // "succeeded", "failed", "pending"
      paymentId: paymentId,
    })
  } catch (error) {
    console.error("UniCredit payment verification error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
