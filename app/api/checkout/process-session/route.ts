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

    // Retrieve session with expanded setup_intent and payment_intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'payment_intent', 'setup_intent.payment_method', 'payment_intent.payment_method'],
    })
    
    const sessionMode = session.mode // "payment" or "setup"
    console.log("[v0 PROCESS-SESSION] Session mode:", sessionMode)
    console.log("[v0 PROCESS-SESSION] Stripe payment_status:", session.payment_status)

    // For "payment" mode: status should be "paid"
    // For "setup" mode: status should be "no_payment_required" (card saved successfully)
    const isPaymentComplete = session.payment_status === "paid"
    const isSetupComplete = session.payment_status === "no_payment_required" && sessionMode === "setup"
    
    if (!isPaymentComplete && !isSetupComplete) {
      console.log("[v0 PROCESS-SESSION] Payment/setup not complete:", session.payment_status)
      return NextResponse.json({ error: "Pagamento/setup non completato" }, { status: 400 })
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
      // New booking confirmation - handle both payment and setup modes
      console.log("[v0 PROCESS-SESSION] Confirming new booking, mode:", sessionMode)
      
      // Get payment method details
      let paymentMethodId: string | null = null
      let cardBrand: string | null = null
      let cardLast4: string | null = null
      
      if (sessionMode === "payment" && session.payment_intent) {
        // Payment mode - get payment method from payment_intent
        const paymentIntent = session.payment_intent as Stripe.PaymentIntent
        paymentMethodId = paymentIntent.payment_method as string
        
        if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
          const pm = paymentIntent.payment_method as Stripe.PaymentMethod
          cardBrand = pm.card?.brand || null
          cardLast4 = pm.card?.last4 || null
        } else if (paymentMethodId) {
          // Fetch payment method details
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
            cardBrand = pm.card?.brand || null
            cardLast4 = pm.card?.last4 || null
          } catch (e) {
            console.log("[v0 PROCESS-SESSION] Could not fetch payment method:", e)
          }
        }
        
        // Update booking as PAID (immediate charge)
        const totalAmountCents = booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100)
        await updateDoc(bookingRef, {
          status: "confirmed",
          paymentStatus: "paid",
          paymentProvider: "stripe",
          paymentId: paymentIntent.id,
          paymentMethodId,
          stripeCustomerId: session.customer as string,
          cardBrand,
          cardLast4,
          depositPaid: totalAmountCents,
          balanceDue: 0,
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        console.log("[v0 PROCESS-SESSION] Booking PAID immediately:", {
          paymentIntentId: paymentIntent.id,
          amount: totalAmountCents / 100,
          cardLast4,
        })
        
      } else if (sessionMode === "setup" && session.setup_intent) {
        // Setup mode - card saved for later charge
        const setupIntent = session.setup_intent as Stripe.SetupIntent
        paymentMethodId = setupIntent.payment_method as string
        
        if (setupIntent.payment_method && typeof setupIntent.payment_method === 'object') {
          const pm = setupIntent.payment_method as Stripe.PaymentMethod
          cardBrand = pm.card?.brand || null
          cardLast4 = pm.card?.last4 || null
        } else if (paymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
            cardBrand = pm.card?.brand || null
            cardLast4 = pm.card?.last4 || null
          } catch (e) {
            console.log("[v0 PROCESS-SESSION] Could not fetch payment method:", e)
          }
        }
        
        // Update booking with card saved (will be charged 7 days before check-in)
        await updateDoc(bookingRef, {
          status: "confirmed",
          paymentStatus: "card_saved",
          paymentProvider: "stripe",
          setupIntentId: setupIntent.id,
          paymentMethodId,
          stripeCustomerId: session.customer as string,
          cardBrand,
          cardLast4,
          depositPaid: 0,
          balanceDue: booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100),
          updatedAt: serverTimestamp(),
        })
        console.log("[v0 PROCESS-SESSION] Card SAVED for later charge:", {
          setupIntentId: setupIntent.id,
          cardLast4,
          balanceDue: booking.totalAmountCents || Math.round((booking.totalAmount || 0) * 100),
        })
        
      } else {
        // Fallback - just confirm
        await updateDoc(bookingRef, {
          status: "confirmed",
          paymentProvider: "stripe",
          stripeCustomerId: session.customer as string,
          updatedAt: serverTimestamp(),
        })
        console.log("[v0 PROCESS-SESSION] Booking confirmed (fallback)")
      }
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
