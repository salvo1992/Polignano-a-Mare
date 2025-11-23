import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights, calculateDaysUntilCheckIn, calculateChangeDatesPenalty } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })

export async function PUT(request: NextRequest) {
  try {
    const { bookingId, checkIn, checkOut, userId, newPrice, penalty } = await request.json()

    console.log("[v0 DEBUG] ====== CHANGE DATES REQUEST START ======")
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

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const bookingData = bookingSnap.data()

    // Verify user owns this booking
    if (userId && bookingData?.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const priceResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bookings/calculate-price`, {
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
      throw new Error("Failed to calculate new price")
    }

    const priceData = await priceResponse.json()
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

      // Client needs to pay additional amount
      const depositAmount = Math.round(priceDifference * 0.3) // 30% deposit on difference
      const balanceAmount = priceDifference - depositAmount // 70% balance

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

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        client_reference_id: bookingId,
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Acconto Modifica Date - ${bookingData?.roomName || "Camera"}`,
                description: `Nuove date: ${checkIn} - ${checkOut}${penaltyAmount > 0 ? ` (include penale €${(penaltyAmount / 100).toFixed(2)})` : ""}\nAcconto 30% della differenza, saldo 70% da pagare 7 giorni prima del check-in`,
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
        message: `Richiesto acconto aggiuntivo di €${(depositAmount / 100).toFixed(2)}`,
      })
    }

    if (priceDifference < 0) {
      const refundAmount = Math.abs(priceDifference)

      console.log("[v0] Issuing automatic refund:", {
        refundAmount: refundAmount / 100,
        paymentId: bookingData?.paymentId,
      })

      if (bookingData?.paymentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: bookingData.paymentId,
            amount: refundAmount,
            reason: "requested_by_customer",
            metadata: {
              bookingId,
              reason: "date_change_price_decrease",
              originalAmount: (originalAmount / 100).toFixed(2),
              newAmount: (totalAmount / 100).toFixed(2),
            },
          })

          console.log("[v0] Refund issued successfully:", refund.id)

          await bookingRef.update({
            checkIn,
            checkOut,
            nights,
            totalAmount,
            depositPaid: Math.round(totalAmount * 0.3), // Recalculate 30% deposit on new total
            balanceDue: Math.round(totalAmount * 0.7), // Recalculate 70% balance on new total
            lastRefund: {
              id: refund.id,
              amount: refundAmount,
              reason: "date_change_price_decrease",
              createdAt: FieldValue.serverTimestamp(),
            },
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
            refundAmount,
          })

          console.log("[API] Booking dates changed with refund:", bookingId)

          return NextResponse.json({
            success: true,
            nights,
            totalAmount: totalAmount / 100,
            priceDifference: priceDifference / 100,
            refundIssued: true,
            refundAmount: refundAmount / 100,
            message: `Date modificate. Rimborso di €${(refundAmount / 100).toFixed(2)} in corso.`,
          })
        } catch (refundError) {
          console.error("[v0] Error issuing refund:", refundError)
          // Continue with booking update even if refund fails
        }
      }
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
  } catch (error) {
    console.error("[v0 DEBUG] ❌ ERROR in change-dates:", error)
    return NextResponse.json({ error: "Errore nella modifica delle date" }, { status: 500 })
  }
}
