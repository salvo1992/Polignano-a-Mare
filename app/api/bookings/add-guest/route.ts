import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { Resend } from "resend"
import { sendBookingConfirmationEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" })
const resend = new Resend(process.env.RESEND_API_KEY)

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

    if (newGuestsCount > maxGuests) {
      return NextResponse.json({ error: "Numero massimo di ospiti raggiunto" }, { status: 400 })
    }

    const newTotalAmount = (booking?.totalAmount || 0) + priceDifference

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
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=cancelled`,
        metadata: {
          bookingId,
          type: "add_guest",
          newGuestsCount: newGuestsCount.toString(),
          newTotalAmount: newTotalAmount.toString(),
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
    })

    const nights = calculateNights(booking?.checkIn, booking?.checkOut)
    await sendBookingConfirmationEmail({
      to: booking?.email,
      bookingId,
      firstName: booking?.firstName,
      lastName: booking?.lastName,
      checkIn: booking?.checkIn,
      checkOut: booking?.checkOut,
      roomName: booking?.roomName,
      guests: newGuestsCount,
      totalAmount: newTotalAmount,
      nights,
    })

    console.log("[API] Guests added successfully:", bookingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding guest:", error)
    return NextResponse.json({ error: "Errore nell'aggiunta dell'ospite" }, { status: 500 })
  }
}
