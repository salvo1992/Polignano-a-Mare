import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights, calculateDaysUntilCheckIn, calculateChangeDatesPenalty } from "@/lib/pricing"

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[v0 CRITICAL] ❌ STRIPE_SECRET_KEY is missing at module load!")
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

console.log("[v0 DEBUG] 🔧 Module loaded - Stripe key present:", process.env.STRIPE_SECRET_KEY?.slice(0, 10) + "...")

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
})

console.log("[v0 DEBUG] ✅ Stripe client initialized successfully")

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0 DEBUG] ====== CHANGE DATES REQUEST START ======")
    console.log("[v0 DEBUG] Environment:", process.env.NODE_ENV)
    console.log("[v0 DEBUG] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[v0 DEBUG] ❌ STRIPE_SECRET_KEY is missing!")
      return NextResponse.json({ error: "Server configuration error: Missing Stripe key" }, { status: 500 })
    }

    const { bookingId, checkIn, checkOut, userId, newPrice, penalty } = await request.json()

    console.log("[v0 DEBUG] Input:", { bookingId, checkIn, checkOut, newPrice, penalty })

    if (!bookingId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    // Validate dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json({ error: "La data di check-in non può essere nel passato" }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: "Il check-out deve essere dopo il check-in" }, { status: 400 })
    }

    console.log("[v0 DEBUG] 📦 Getting Firebase DB...")
    let db, bookingRef, bookingSnap, bookingData
    try {
      db = getAdminDb()
      bookingRef = db.collection("bookings").doc(bookingId)
      bookingSnap = await bookingRef.get()

      if (!bookingSnap.exists) {
        return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
      }

      bookingData = bookingSnap.data()
      console.log("[v0 DEBUG] ✅ Booking data retrieved:", {
        id: bookingId,
        roomId: bookingData?.roomId,
        originalCheckIn: bookingData?.checkIn,
        originalCheckOut: bookingData?.checkOut,
        totalAmount: bookingData?.totalAmount,
      })
    } catch (firebaseError: any) {
      console.error("[v0 DEBUG] ❌ Firebase Error:", firebaseError)
      console.error("[v0 DEBUG] Error details:", {
        message: firebaseError.message,
        stack: firebaseError.stack,
        code: firebaseError.code,
      })
      return NextResponse.json(
        {
          error: "Database error",
          details: firebaseError.message,
        },
        { status: 500 },
      )
    }

    // Verify user owns this booking
    if (userId && bookingData?.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    console.log("[v0 DEBUG] 💰 Calculating new price...")
    let priceData
    try {
      const baseUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"

      const priceResponse = await fetch(`${baseUrl}/api/bookings/calculate-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn,
          checkOut,
          roomId: bookingData?.roomId,
        }),
      })

      if (!priceResponse.ok) {
        const errorText = await priceResponse.text()
        console.error("[v0 DEBUG] ❌ Price calculation failed:", errorText)
        throw new Error(`Failed to calculate new price: ${priceResponse.status} ${errorText}`)
      }

      priceData = await priceResponse.json()
      console.log("[v0 DEBUG] ✅ Price calculated:", priceData)
    } catch (priceError: any) {
      console.error("[v0 DEBUG] ❌ Price Calculation Error:", priceError)
      console.error("[v0 DEBUG] Error details:", {
        message: priceError.message,
        stack: priceError.stack,
      })
      return NextResponse.json(
        {
          error: "Failed to calculate price",
          details: priceError.message,
        },
        { status: 500 },
      )
    }

    const basePrice = priceData.newPrice * 100 // Convert to cents

    const nights = calculateNights(checkIn, checkOut)
    const daysUntilCheckIn = calculateDaysUntilCheckIn(bookingData?.checkIn)
    const penaltyAmount = calculateChangeDatesPenalty(bookingData?.totalAmount || 0, daysUntilCheckIn)
    const totalAmount = basePrice + penaltyAmount

    const originalAmount = bookingData?.totalAmount || 0
    const priceDifference = totalAmount - originalAmount

    console.log("[v0] Price calculation:", {
      basePrice: basePrice / 100,
      penaltyAmount: penaltyAmount / 100,
      totalAmount: totalAmount / 100,
      priceDifference: priceDifference / 100,
      daysUntilCheckIn,
    })

    if (priceDifference > 0) {
      const baseUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"

      console.log("[v0 DEBUG] 🌐 Environment:", process.env.NODE_ENV)
      console.log("[v0 DEBUG] 🔗 Base URL:", baseUrl)

      const depositAmount = priceDifference // Full amount, not 30%
      const balanceAmount = 0 // No balance since paying full difference

      console.log("[v0 DEBUG] Price increased, creating Stripe checkout...")
      console.log("[v0 DEBUG] Checkout metadata:", {
        bookingId,
        type: "change_dates",
        checkIn,
        checkOut,
        newTotalAmount: totalAmount,
        penalty: penaltyAmount,
        depositAmount,
        balanceAmount,
      })

      const successUrl = `${baseUrl}/user/booking/${bookingId}?payment=processing`
      const cancelUrl = `${baseUrl}/user/booking/${bookingId}?payment=cancelled`

      console.log("[v0 DEBUG] ==========================================")
      console.log("[v0 DEBUG] ✅ SUCCESS URL:", successUrl)
      console.log("[v0 DEBUG] ❌ CANCEL URL:", cancelUrl)
      console.log("[v0 DEBUG] 💡 Webhook will update database after payment")
      console.log("[v0 DEBUG] ==========================================")

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          client_reference_id: bookingId,
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Pagamento Modifica Date - ${bookingData?.roomName || "Camera"}`,
                  description: `Nuove date: ${checkIn} - ${checkOut}${penaltyAmount > 0 ? ` (include penale €${(penaltyAmount / 100).toFixed(2)})` : ""}\nImporto totale della differenza`,
                },
                unit_amount: depositAmount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            bookingId,
            type: "change_dates",
            checkIn,
            checkOut,
            newTotalAmount: totalAmount.toString(),
            penalty: penaltyAmount.toString(),
            originalAmount: originalAmount.toString(),
            priceDifference: priceDifference.toString(),
            depositAmount: depositAmount.toString(),
            balanceAmount: balanceAmount.toString(),
          },
        })

        console.log("[v0 DEBUG] ==========================================")
        console.log("[v0 DEBUG] ✅ Checkout Session Created Successfully!")
        console.log("[v0 DEBUG] Session ID:", session.id)
        console.log("[v0 DEBUG] Checkout URL:", session.url)
        console.log("[v0 DEBUG] ⚠️  After payment, Stripe will redirect to:", successUrl)
        console.log("[v0 DEBUG] 🔔 Webhook will update the database automatically")
        console.log("[v0 DEBUG] ==========================================")
        console.log("[v0 DEBUG] ====== RETURNING WITHOUT DB UPDATE ======")

        return NextResponse.json({
          success: true,
          paymentRequired: true,
          paymentUrl: session.url,
          depositAmount: depositAmount / 100,
          balanceAmount: balanceAmount / 100,
          message: `Richiesto pagamento totale di €${(depositAmount / 100).toFixed(2)}`,
        })
      } catch (stripeError: any) {
        console.error("[v0 DEBUG] ❌ Stripe Checkout Error:", stripeError)
        console.error("[v0 DEBUG] Error details:", {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          stack: stripeError.stack,
        })
        return NextResponse.json(
          {
            error: "Failed to create payment session",
            details: stripeError.message,
          },
          { status: 500 },
        )
      }
    }

    if (priceDifference < 0) {
      const refundAmount = Math.abs(priceDifference)

      console.log("[v0] Price decreased - notifying customer about manual refund:", {
        refundAmount: refundAmount / 100,
      })

      // Update booking with new dates
      await bookingRef.update({
        checkIn,
        checkOut,
        nights,
        totalAmount,
        depositPaid: Math.round(totalAmount * 0.3),
        balanceDue: Math.round(totalAmount * 0.7),
        pendingRefund: {
          amount: refundAmount,
          reason: "date_change_price_decrease",
          requestedAt: FieldValue.serverTimestamp(),
          status: "pending_manual_processing",
        },
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Send email notification about manual refund
      await sendModificationEmail({
        to: bookingData?.email,
        bookingId,
        firstName: bookingData?.firstName,
        lastName: bookingData?.lastName,
        checkIn,
        checkOut,
        roomName: bookingData?.roomName,
        guests: bookingData?.guests || 2,
        nights,
        originalAmount,
        newAmount: totalAmount,
        penalty: penaltyAmount,
        dateChangeCost: priceDifference,
        modificationType: "dates",
        refundAmount, // This will trigger the refund notification in the email
        manualRefund: true, // New flag to indicate manual processing
      })

      console.log("[API] Booking dates changed - refund will be processed manually:", bookingId)

      return NextResponse.json({
        success: true,
        nights,
        totalAmount: totalAmount / 100,
        priceDifference: priceDifference / 100,
        refundIssued: false,
        refundPending: true,
        refundAmount: refundAmount / 100,
        message: `Date modificate. Rimborso di €${(refundAmount / 100).toFixed(2)} verrà elaborato manualmente entro 5-10 giorni lavorativi.`,
      })
    }

    await bookingRef.update({
      checkIn,
      checkOut,
      nights,
      totalAmount,
      depositPaid: Math.round(totalAmount * 0.3),
      balanceDue: Math.round(totalAmount * 0.7),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sendModificationEmail({
      to: bookingData?.email,
      bookingId,
      firstName: bookingData?.firstName,
      lastName: bookingData?.lastName,
      checkIn,
      checkOut,
      roomName: bookingData?.roomName,
      guests: bookingData?.guests || 2,
      nights,
      originalAmount,
      newAmount: totalAmount,
      penalty: penaltyAmount,
      dateChangeCost: priceDifference,
      modificationType: "dates",
    })

    console.log("[API] Booking dates changed successfully:", bookingId)

    return NextResponse.json({
      success: true,
      nights,
      totalAmount: totalAmount / 100,
      priceDifference: priceDifference / 100,
      refundIssued: false,
      message: "Date modificate con successo",
    })
  } catch (error: any) {
    console.error("[v0 DEBUG] ❌❌❌ FATAL ERROR in change-dates ❌❌❌")
    console.error("[v0 DEBUG] Error type:", error.constructor.name)
    console.error("[v0 DEBUG] Error message:", error.message)
    console.error("[v0 DEBUG] Error stack:", error.stack)
    console.error("[v0 DEBUG] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)))

    return NextResponse.json(
      {
        error: "Errore nella modifica delle date",
        details: error.message,
        type: error.constructor.name,
      },
      { status: 500 },
    )
  }
}
