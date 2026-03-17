import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    console.log("[v0 PROCESS-SESSION] ====== START ======")
    console.log("[v0 PROCESS-SESSION] Session ID:", sessionId)

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID mancante" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("[v0 PROCESS-SESSION] Stripe status:", session.payment_status)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento non completato" }, { status: 400 })
    }

    const metadata = session.metadata
    if (!metadata || !metadata.bookingId) {
      return NextResponse.json({ error: "Metadati sessione mancanti" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", metadata.bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    console.log("[v0 PROCESS-SESSION] Booking found:", metadata.bookingId)

    if (metadata.type === "change_dates") {
      const depositAmountCents = Number.parseInt(metadata.depositAmount)
      const balanceAmountCents = Number.parseInt(metadata.balanceAmount)
      const newTotalAmountCents = Number.parseInt(metadata.newTotalAmount)
      const penaltyCents = Number.parseInt(metadata.penalty || "0")
      const priceDifferenceCents = Number.parseInt(metadata.priceDifference)

      console.log("[v0 PROCESS-SESSION] Change dates:", {
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        newTotal: newTotalAmountCents / 100,
      })

      await updateDoc(bookingRef, {
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
        totalAmount: newTotalAmountCents / 100, // Store as euros
        totalAmountCents: newTotalAmountCents,
        depositPaid: increment(depositAmountCents),
        balanceDue: increment(balanceAmountCents),
        updatedAt: serverTimestamp(),
      })

      try {
        await sendModificationEmail({
          to: booking?.email,
          bookingId: metadata.bookingId,
          firstName: booking?.firstName,
          lastName: booking?.lastName,
          checkIn: metadata.checkIn,
          checkOut: metadata.checkOut,
          roomName: booking?.roomName,
          guests: booking?.guests || 2,
          nights: calculateNights(metadata.checkIn, metadata.checkOut),
          originalAmount: Number.parseInt(metadata.originalAmount) / 100, // Convert to euros
          newAmount: newTotalAmountCents / 100, // Convert to euros
          penalty: penaltyCents / 100, // Convert to euros
          dateChangeCost: priceDifferenceCents / 100, // Convert to euros
          modificationType: "dates",
        })
      } catch (emailErr) {
        console.error("[v0 PROCESS-SESSION] Email error:", emailErr)
      }
    } else if (metadata.type === "add_guest") {
      const newGuestsCount = Number.parseInt(metadata.newGuestsCount)
      const newTotalAmountCents = Number.parseInt(metadata.newTotalAmount)
      const originalAmountCents = Number.parseInt(metadata.originalAmount)
      const guestAdditionCostCents = Number.parseInt(metadata.guestAdditionCost)

      await updateDoc(bookingRef, {
        guests: newGuestsCount,
        totalAmount: newTotalAmountCents / 100, // Store as euros
        totalAmountCents: newTotalAmountCents,
        updatedAt: serverTimestamp(),
      })

      try {
        const nights = calculateNights(booking?.checkIn, booking?.checkOut)
        await sendModificationEmail({
          to: booking?.email,
          bookingId: metadata.bookingId,
          firstName: booking?.firstName,
          lastName: booking?.lastName,
          checkIn: booking?.checkIn,
          checkOut: booking?.checkOut,
          roomName: booking?.roomName,
          guests: newGuestsCount,
          nights,
          originalAmount: originalAmountCents / 100, // Convert to euros
          newAmount: newTotalAmountCents / 100, // Convert to euros
          guestAdditionCost: guestAdditionCostCents / 100, // Convert to euros
          modificationType: "guests",
        })
      } catch (emailErr) {
        console.error("[v0 PROCESS-SESSION] Email error:", emailErr)
      }
    } else {
      // New booking confirmation
      console.log("[v0 PROCESS-SESSION] Confirming new booking")
      await updateDoc(bookingRef, {
        status: "confirmed",
        paymentProvider: "stripe",
        paymentId: session.payment_intent as string,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log("[v0 PROCESS-SESSION] Booking confirmed successfully")
    }

    // Re-read updated booking
    const updatedSnap = await getDoc(bookingRef)
    const updatedBooking = updatedSnap.data()

    // Serialize Firestore Timestamps and ensure dates are strings
    const serialized: Record<string, any> = {
      id: metadata.bookingId,
      bookingId: metadata.bookingId,
    }
    if (updatedBooking) {
      for (const [key, value] of Object.entries(updatedBooking)) {
        if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
          // Firestore Timestamp -> ISO string
          serialized[key] = value.toDate().toISOString()
        } else if (value && typeof value === "object" && ("seconds" in value || "_seconds" in value)) {
          // Serialized Timestamp
          const secs = (value as any).seconds || (value as any)._seconds || 0
          serialized[key] = new Date(secs * 1000).toISOString()
        } else {
          serialized[key] = value
        }
      }
    }

    // Ensure checkIn/checkOut are YYYY-MM-DD strings for Smoobu
    if (serialized.checkIn && serialized.checkIn.includes("T")) {
      serialized.checkIn = serialized.checkIn.split("T")[0]
    }
    if (serialized.checkOut && serialized.checkOut.includes("T")) {
      serialized.checkOut = serialized.checkOut.split("T")[0]
    }

    console.log("[v0 PROCESS-SESSION] Returning booking:", {
      roomId: serialized.roomId,
      checkIn: serialized.checkIn,
      checkOut: serialized.checkOut,
    })
    console.log("[v0 PROCESS-SESSION] ====== COMPLETE ======")

    return NextResponse.json({
      success: true,
      booking: serialized,
    })
  } catch (error: any) {
    console.error("[v0 PROCESS-SESSION] ERROR:", error)
    return NextResponse.json({ error: error.message || "Errore nell'elaborazione" }, { status: 500 })
  }
}
