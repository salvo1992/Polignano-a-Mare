import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendBookingUpdateEmail } from "@/lib/email"
import {
  calculateNights,
  calculatePriceByGuests,
  calculateDaysUntilCheckIn,
  calculateChangeDatesPenalty,
} from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })

export async function PUT(request: NextRequest) {
  try {
    const { bookingId, checkIn, checkOut, userId, newPrice, penalty, priceDifference } = await request.json()

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

    const nights = calculateNights(checkIn, checkOut)
    const guests = bookingData?.guests || 2
    const basePrice = calculatePriceByGuests(guests, nights)

    // Calculate penalty if within 7 days of original check-in
    const daysUntilCheckIn = calculateDaysUntilCheckIn(bookingData?.checkIn)
    const penaltyAmount = calculateChangeDatesPenalty(bookingData?.totalAmount || 0, daysUntilCheckIn)
    const totalAmount = basePrice + penaltyAmount

    const totalDifference = totalAmount - (bookingData?.totalAmount || 0)

    if (totalDifference > 0) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Modifica Date - ${bookingData?.roomName || "Camera"}`,
                description: `Nuove date: ${checkIn} - ${checkOut}${penaltyAmount > 0 ? ` (include penale €${(penaltyAmount / 100).toFixed(2)})` : ""}`,
              },
              unit_amount: totalDifference,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}&type=change_dates`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=cancelled`,
        metadata: {
          bookingId,
          type: "change_dates",
          checkIn,
          checkOut,
          newPrice: totalAmount.toString(),
          penalty: penaltyAmount.toString(),
          priceDifference: (basePrice - (bookingData?.totalAmount || 0)).toString(),
          originalAmount: (bookingData?.totalAmount || 0).toString(),
        },
      })

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
      })
    }

    await bookingRef.update({
      checkIn,
      checkOut,
      nights,
      totalAmount,
      updatedAt: FieldValue.serverTimestamp(),
      modifications: FieldValue.arrayUnion({
        type: "change_dates",
        timestamp: new Date().toISOString(),
        oldCheckIn: bookingData?.checkIn,
        oldCheckOut: bookingData?.checkOut,
        newCheckIn: checkIn,
        newCheckOut: checkOut,
        penalty: penaltyAmount,
        priceDifference: basePrice - (bookingData?.totalAmount || 0),
      }),
    })

    try {
      await sendBookingUpdateEmail({
        to: bookingData?.email || "",
        bookingId,
        firstName: bookingData?.firstName || "",
        lastName: bookingData?.lastName || "",
        roomName: bookingData?.roomName || "",
        checkIn,
        checkOut,
        guests,
        nights,
        originalAmount: bookingData?.totalAmount || 0,
        newAmount: totalAmount,
        penalty: penaltyAmount,
        priceDifference: basePrice - (bookingData?.totalAmount || 0),
        modificationType: "change_dates",
      })
    } catch (error) {
      console.error("[API] Error sending update email:", error)
    }

    console.log("[API] Booking dates changed successfully:", bookingId)

    return NextResponse.json({ success: true, nights, totalAmount })
  } catch (error) {
    console.error("Error changing dates:", error)
    return NextResponse.json({ error: "Errore nella modifica delle date" }, { status: 500 })
  }
}


