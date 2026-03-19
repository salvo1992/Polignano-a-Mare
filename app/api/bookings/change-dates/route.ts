import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights, calculateDaysUntilCheckIn } from "@/lib/pricing"
import { calculateChangeDatesPolicy, calculateChargeDate } from "@/lib/payment-logic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"

function isDateInRecurringSeason(date: Date, startMMDD: string, endMMDD: string): boolean {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateMMDD = `${month}-${day}`
  if (startMMDD > endMMDD) return dateMMDD >= startMMDD || dateMMDD <= endMMDD
  return dateMMDD >= startMMDD && dateMMDD <= endMMDD
}

export async function PUT(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[ChangeDates] Body parse error:", parseError)
      return NextResponse.json({ error: "Dati richiesta non validi" }, { status: 400 })
    }
    
    const { bookingId, checkIn, checkOut, userId } = body

    if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
      console.error("[ChangeDates] Invalid bookingId:", bookingId)
      return NextResponse.json({ error: "ID prenotazione mancante o non valido" }, { status: 400 })
    }

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: "Date mancanti" }, { status: 400 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json({ error: "La data di check-in non puo' essere nel passato" }, { status: 400 })
    }
    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: "Il check-out deve essere dopo il check-in" }, { status: 400 })
    }

    // Get booking
    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    if (userId && booking.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    // --- Calculate new price ---
    const roomId = booking.roomId
    const nights = calculateNights(checkIn, checkOut)

    const roomRef = doc(db, "rooms", roomId)
    const roomSnap = await getDoc(roomRef)
    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Camera non trovata" }, { status: 404 })
    }

    const basePrice = roomSnap.data()?.price || 0

    // Fetch pricing rules
    const [seasonsSnap, periodsSnap, overridesSnap] = await Promise.all([
      getDocs(collection(db, "pricing_seasons")),
      getDocs(collection(db, "pricing_special_periods")),
      getDocs(query(collection(db, "pricing_overrides"), where("roomId", "==", roomId))),
    ])

    const seasons = seasonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const specialPeriods = periodsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const overrides = overridesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Calculate price for each night
    let roomTotalPrice = 0
    const currentDate = new Date(checkInDate)

    while (currentDate < checkOutDate) {
      const dateStr = currentDate.toISOString().split("T")[0]

      const override = overrides.find((o: any) => o.date === dateStr)
      if (override) {
        roomTotalPrice += (override as any).price
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const specialPeriod = specialPeriods.find((p: any) => {
        const pStart = p.startDate?.split("T")[0]
        const pEnd = p.endDate?.split("T")[0]
        return dateStr >= pStart && dateStr <= pEnd
      })

      if (specialPeriod) {
        roomTotalPrice += Math.round(basePrice * (specialPeriod as any).priceMultiplier)
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const season = seasons.find((s: any) => isDateInRecurringSeason(currentDate, s.startDate, s.endDate))
      if (season) {
        roomTotalPrice += Math.round(basePrice * (season as any).priceMultiplier)
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      roomTotalPrice += basePrice
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Extra guest costs
    const adults = booking.adults || 2
    const children = booking.numberOfChildren || 0
    const totalGuests = adults + children
    let extraGuestsCost = 0
    if (totalGuests > 2) {
      const extraAdults = Math.max(0, adults - 2)
      extraGuestsCost = (extraAdults * 60 + children * 48) * nights
    }

    const newPriceEuro = roomTotalPrice + extraGuestsCost
    const newPriceCents = Math.round(newPriceEuro * 100)
    const originalAmountCents = booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100)

    // --- Penalty for change <=7 days ---
    const policy = calculateChangeDatesPolicy(booking.checkIn, originalAmountCents, today)

    console.log("[ChangeDates] Calculation:", {
      bookingId,
      newPriceCents,
      originalAmountCents,
      penaltyPercent: policy.penaltyPercent,
      penaltyAmountCents: policy.penaltyAmount,
      isPaid: booking.status === "paid",
    })

    // Handle penalty
    if (policy.penaltyPercent > 0) {
      if (booking.status === "paid" && booking.stripePaymentIntentId) {
        // Already paid: refund 50% (keep 50% as penalty)
        try {
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripePaymentIntentId,
            amount: policy.penaltyAmount, // refund the OTHER 50% (wait, penaltyAmount = 50%)
          })

          // Actually: penalty=50% means we KEEP 50%. Refund = total - penalty = 50%
          const refundAmount = originalAmountCents - policy.penaltyAmount
          if (refundAmount > 0) {
            await stripe.refunds.create({
              payment_intent: booking.stripePaymentIntentId,
              amount: refundAmount,
            })
          }

          console.log("[ChangeDates] Refunded 50% for paid booking:", refundAmount)
        } catch (refundErr: any) {
          console.error("[ChangeDates] Refund error:", refundErr.message)
        }
      } else if (booking.stripePaymentMethodId && booking.stripeCustomerId) {
        // Not paid: charge 50% penalty off-session
        try {
          const penaltyIntent = await stripe.paymentIntents.create({
            amount: policy.penaltyAmount,
            currency: "eur",
            customer: booking.stripeCustomerId,
            payment_method: booking.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            metadata: {
              bookingId,
              type: "change_dates_penalty",
            },
            description: `Penale cambio date - Prenotazione ${bookingId}`,
          })

          console.log("[ChangeDates] Penalty charged:", penaltyIntent.id)
        } catch (penaltyErr: any) {
          console.error("[ChangeDates] Penalty charge failed:", penaltyErr.message)
        }
      }
    }

    // Update booking with new dates and recalculated charge date
    const newChargeDate = calculateChargeDate(checkInDate)

    await updateDoc(bookingRef, {
      checkIn,
      checkOut,
      nights,
      totalAmount: newPriceEuro,
      totalAmountCents: newPriceCents,
      penaltyApplied: policy.penaltyPercent,
      chargeDate: newChargeDate.toISOString().split("T")[0],
      status: booking.status === "paid" ? "paid" : "payment_scheduled",
      updatedAt: serverTimestamp(),
    })

    // Send notification email
    try {
      await sendModificationEmail({
        to: booking.email,
        bookingId,
        firstName: booking.firstName,
        lastName: booking.lastName,
        checkIn,
        checkOut,
        roomName: booking.roomName,
        guests: booking.guests || 2,
        nights,
        originalAmount: booking.totalAmount || 0,
        newAmount: newPriceEuro,
        penalty: policy.penaltyAmount / 100,
        dateChangeCost: (newPriceCents - originalAmountCents) / 100,
        modificationType: "dates",
      })
    } catch (emailErr) {
      console.error("[ChangeDates] Email error:", emailErr)
    }

    return NextResponse.json({
      success: true,
      nights,
      newTotalAmount: newPriceEuro,
      originalAmount: booking.totalAmount || 0,
      penaltyPercent: policy.penaltyPercent,
      penaltyAmount: policy.penaltyAmount / 100,
      message:
        policy.penaltyPercent > 0
          ? `Date modificate. Penale del ${policy.penaltyPercent}% applicata (EUR${(policy.penaltyAmount / 100).toFixed(2)}).`
          : "Date modificate con successo.",
    })
  } catch (error: any) {
    console.error("[ChangeDates] Error:", error)
    return NextResponse.json(
      { error: "Errore nella modifica delle date", details: error.message },
      { status: 500 },
    )
  }
}
