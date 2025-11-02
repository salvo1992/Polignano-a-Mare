import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendBookingUpdateEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })

export async function PUT(request: NextRequest) {
  try {
    const { bookingId, newGuestsCount, priceDifference } = await request.json()

    if (!bookingId || !newGuestsCount || priceDifference === undefined) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    const currentGuests = booking?.guests || 1
    const maxGuests = booking?.maxGuests || 4
    const originalAmount = booking?.totalAmount || 0

    if (newGuestsCount > maxGuests) {
      return NextResponse.json({ error: "Numero massimo di ospiti raggiunto" }, { status: 400 })
    }

    const newTotalAmount = originalAmount + priceDifference
    const nights = calculateNights(booking?.checkIn, booking?.checkOut)

    if (priceDifference > 0) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Aggiunta Ospiti - ${booking?.roomName || "Camera"}`,
                description: `Da ${currentGuests} a ${newGuestsCount} ospiti`,
              },
              unit_amount: priceDifference,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}&type=add_guests`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=cancelled`,
        metadata: {
          bookingId,
          type: "add_guests",
          newGuestsCount: newGuestsCount.toString(),
          newTotalAmount: newTotalAmount.toString(),
          priceDifference: priceDifference.toString(),
          originalAmount: originalAmount.toString(),
        },
      })

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
      })
    }

    await bookingRef.update({
      guests: newGuestsCount,
      totalAmount: newTotalAmount,
      updatedAt: FieldValue.serverTimestamp(),
      modifications: FieldValue.arrayUnion({
        type: "add_guests",
        timestamp: new Date().toISOString(),
        oldGuests: currentGuests,
        newGuests: newGuestsCount,
        priceDifference,
      }),
    })

    try {
      await sendBookingUpdateEmail({
        to: booking?.email || "",
        bookingId,
        firstName: booking?.firstName || "",
        lastName: booking?.lastName || "",
        roomName: booking?.roomName || "",
        checkIn: booking?.checkIn || "",
        checkOut: booking?.checkOut || "",
        guests: newGuestsCount,
        nights,
        originalAmount,
        newAmount: newTotalAmount,
        priceDifference,
        modificationType: "add_guests",
      })
    } catch (error) {
      console.error("[API] Error sending update email:", error)
    }

    console.log("[API] Guests added successfully:", bookingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding guest:", error)
    return NextResponse.json({ error: "Errore nell'aggiunta dell'ospite" }, { status: 500 })
  }
}

