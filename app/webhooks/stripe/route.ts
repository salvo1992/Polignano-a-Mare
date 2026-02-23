import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { admin, getFirestore, isFirebaseInitialized } from "@/lib/firebase-admin"
import { sendBookingConfirmationEmail, sendModificationEmail } from "@/lib/email"
import { smoobuClient } from "@/lib/smoobu-client"
import { calculateChargeDate } from "@/lib/payment-logic"

export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// --- Helpers ---

async function alreadyProcessed(eventId: string) {
  if (!isFirebaseInitialized()) return false
  const db = getFirestore()
  const snap = await db.doc(`stripe_webhook_events/${eventId}`).get()
  return snap.exists
}

async function markProcessed(eventId: string, payload: any) {
  if (!isFirebaseInitialized()) return
  const db = getFirestore()
  await db
    .doc(`stripe_webhook_events/${eventId}`)
    .set({ receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload }, { merge: true })
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log("[Webhook] Event:", event.type, "ID:", event.id)

    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (!isFirebaseInitialized()) {
      console.error("[Webhook] Firebase Admin not initialized")
      return NextResponse.json({ error: "Server not ready" }, { status: 500 })
    }

    const db = getFirestore()

    // ============================================================
    // 1) SETUP INTENT SUCCEEDED
    //    Saves the card (PaymentMethod) on the booking for future off-session charges
    // ============================================================
    if (event.type === "setup_intent.succeeded") {
      const setupIntent = event.data.object as Stripe.SetupIntent

      // bookingId is now directly in setupIntent.metadata (set via setup_intent_data)
      const bookingId = setupIntent.metadata?.bookingId || null
      const totalAmountCents = parseInt(setupIntent.metadata?.totalAmountCents || "0")
      const currency = (setupIntent.metadata?.currency || "eur").toLowerCase()

      if (!bookingId) {
        console.error("[Webhook] setup_intent.succeeded: no bookingId in metadata")
        await markProcessed(event.id, { error: "no_bookingId" })
        return NextResponse.json({ received: true })
      }

      const customerId =
        typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id || ""
      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id || ""

      console.log("[Webhook] SetupIntent succeeded:", {
        bookingId,
        customerId,
        paymentMethodId,
        totalAmountCents,
      })

      const bookingRef = db.doc(`bookings/${bookingId}`)
      const bookingSnap = await bookingRef.get()

      if (!bookingSnap.exists) {
        await markProcessed(event.id, { error: "booking_not_found" })
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      const bookingData = bookingSnap.data() as any
      const checkInDate = new Date(bookingData.checkIn)
      const chargeDate = calculateChargeDate(checkInDate)

      await bookingRef.update({
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        stripeSetupIntentId: setupIntent.id,
        totalAmountCents,
        totalAmount: totalAmountCents / 100,
        currency,
        chargeDate: chargeDate.toISOString().split("T")[0],
        status: "payment_scheduled",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Create/link user account
      let uid = ""
      let newPassword: string | undefined

      try {
        const user = await admin.auth().getUserByEmail(bookingData.email)
        uid = user.uid
      } catch {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        newPassword = Array.from({ length: 12 }, () => charset[Math.floor(Math.random() * charset.length)]).join("")

        try {
          const newUser = await admin.auth().createUser({
            email: bookingData.email,
            password: newPassword,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
          })
          uid = newUser.uid

          await db.doc(`users/${uid}`).set({
            uid,
            email: bookingData.email,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            provider: "password",
            role: "user",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        } catch (createError: any) {
          console.error("[Webhook] Error creating user:", createError.message)
        }
      }

      if (uid) {
        await bookingRef.update({
          userId: uid,
          newUserPassword: newPassword || null,
        })
      }

      // Send confirmation email
      try {
        await sendBookingConfirmationEmail({
          to: bookingData.email,
          bookingId,
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          roomName: bookingData.roomName,
          guests: bookingData.guests,
          numberOfChildren: bookingData.numberOfChildren || 0,
          totalAmount: totalAmountCents / 100,
          nights: bookingData.nights,
          newUserPassword: newPassword,
        })
      } catch (emailErr: any) {
        console.error("[Webhook] Email error:", emailErr.message)
      }

      // Create Smoobu reservation
      try {
        if (bookingData.roomId && bookingData.checkIn && bookingData.checkOut) {
          let apartmentId: number | null = null
          const numericId = parseInt(bookingData.roomId)

          if (!isNaN(numericId) && numericId > 1000) {
            apartmentId = numericId
          } else {
            const apartments = await smoobuClient.getApartmentsCached()
            const match = apartments.find(
              (a) =>
                a.name.toLowerCase().includes(bookingData.roomId.toLowerCase()) ||
                bookingData.roomId.toLowerCase().includes(a.name.toLowerCase()),
            )
            apartmentId = match ? match.id : apartments.length > 0 ? apartments[0].id : null
          }

          if (apartmentId) {
            const smoobuResult = await smoobuClient.createReservation({
              apartmentId,
              arrival: bookingData.checkIn,
              departure: bookingData.checkOut,
              firstName: bookingData.firstName || "Guest",
              lastName: bookingData.lastName || "",
              email: bookingData.email || "",
              phone: bookingData.phone || "",
              adults: bookingData.guests || 1,
              children: 0,
              price: totalAmountCents / 100,
              notice: `Prenotazione diretta - ID: ${bookingId}`,
            })

            await bookingRef.update({
              smoobuReservationId: smoobuResult.id,
              smoobuSyncedAt: new Date().toISOString(),
            })
          }
        }
      } catch (smoobuError: any) {
        console.error("[Webhook] Smoobu error:", smoobuError.message)
      }

      await markProcessed(event.id, { ok: true, bookingId, type: "setup_intent" })
      return NextResponse.json({ received: true, bookingId })
    }

    // ============================================================
    // 2) PAYMENT INTENT SUCCEEDED
    //    Marks the booking as paid (balance charge or penalty)
    // ============================================================
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const bookingId = paymentIntent.metadata?.bookingId
      const type = paymentIntent.metadata?.type || "unknown"

      if (!bookingId) {
        await markProcessed(event.id, { ignored: true, reason: "no_bookingId" })
        return NextResponse.json({ received: true })
      }

      const bookingRef = db.doc(`bookings/${bookingId}`)

      if (type === "balance_charge" || type === "balance_fallback") {
        await bookingRef.update({
          status: "paid",
          stripePaymentIntentId: paymentIntent.id,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log("[Webhook] Balance paid for booking:", bookingId)
      } else if (type === "penalty" || type === "cancellation_penalty" || type === "change_dates_penalty") {
        await bookingRef.update({
          penaltyPaymentIntentId: paymentIntent.id,
          penaltyStatus: "paid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log("[Webhook] Penalty paid for booking:", bookingId)
      }

      await markProcessed(event.id, { ok: true, bookingId, type })
      return NextResponse.json({ received: true, bookingId })
    }

    // ============================================================
    // 3) PAYMENT INTENT FAILED
    //    Marks booking as payment_failed
    // ============================================================
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const bookingId = paymentIntent.metadata?.bookingId

      if (bookingId) {
        const bookingRef = db.doc(`bookings/${bookingId}`)
        await bookingRef.update({
          status: "payment_failed",
          paymentError: paymentIntent.last_payment_error?.message || "Payment failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log("[Webhook] Payment failed for booking:", bookingId)
      }

      await markProcessed(event.id, { bookingId, type: "payment_failed" })
      return NextResponse.json({ received: true })
    }

    // ============================================================
    // 4) PAYMENT INTENT REQUIRES ACTION (SCA)
    //    Marks booking as payment_action_required for telemetry
    // ============================================================
    if (event.type === "payment_intent.requires_action") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const bookingId = paymentIntent.metadata?.bookingId

      if (bookingId) {
        const bookingRef = db.doc(`bookings/${bookingId}`)
        await bookingRef.update({
          status: "payment_action_required",
          stripePaymentIntentId: paymentIntent.id,
          paymentError: "SCA required",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log("[Webhook] Payment requires action (SCA) for booking:", bookingId)
      }

      await markProcessed(event.id, { bookingId, type: "requires_action" })
      return NextResponse.json({ received: true })
    }

    // ============================================================
    // 6) CHARGE REFUNDED
    //    Updates booking status to refunded
    // ============================================================
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id

      if (paymentIntentId) {
        // Find booking by payment intent
        const bookingsSnap = await db
          .collection("bookings")
          .where("stripePaymentIntentId", "==", paymentIntentId)
          .limit(1)
          .get()

        if (!bookingsSnap.empty) {
          const bookingDoc = bookingsSnap.docs[0]
          const refundedTotal = charge.amount_refunded || 0
          const totalPaid = charge.amount || 0
          const isFullRefund = refundedTotal >= totalPaid

          await bookingDoc.ref.update({
            status: isFullRefund ? "refunded" : "partially_refunded",
            refundedAmount: refundedTotal,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })

          console.log("[Webhook] Refund processed:", {
            bookingId: bookingDoc.id,
            refundedTotal,
            isFullRefund,
          })
        }
      }

      await markProcessed(event.id, { type: "charge_refunded", paymentIntentId })
      return NextResponse.json({ received: true })
    }

    // ============================================================
    // 7) CHECKOUT SESSION COMPLETED (legacy + balance_fallback)
    // ============================================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId || session.client_reference_id
      const type = session.metadata?.type || session.metadata?.paymentType || "full"

      if (!bookingId) {
        await markProcessed(event.id, { error: "no_bookingId" })
        return NextResponse.json({ received: true })
      }

      if (session.payment_status !== "paid" && session.mode !== "setup") {
        await markProcessed(event.id, { status: session.payment_status })
        return NextResponse.json({ received: true })
      }

      const bookingRef = db.doc(`bookings/${bookingId}`)

      if (type === "balance_fallback") {
        // Manual payment after 3DS required
        await bookingRef.update({
          status: "paid",
          stripePaymentIntentId: String(session.payment_intent || session.id),
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log("[Webhook] Balance fallback paid:", bookingId)
      } else if (type === "change_dates") {
        // Legacy change-dates payment
        const newTotalAmount = Number.parseFloat(session.metadata?.newTotalAmount || "0")
        const checkIn = session.metadata?.checkIn
        const checkOut = session.metadata?.checkOut

        await bookingRef.update({
          checkIn,
          checkOut,
          totalAmount: newTotalAmount,
          status: "paid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        const bookingData = (await bookingRef.get()).data() as any
        try {
          await sendModificationEmail({
            to: bookingData.email,
            bookingId,
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            checkIn: checkIn || bookingData.checkIn,
            checkOut: checkOut || bookingData.checkOut,
            roomName: bookingData.roomName,
            guests: bookingData.guests,
            nights: Math.ceil(
              (new Date(checkOut || bookingData.checkOut).getTime() -
                new Date(checkIn || bookingData.checkIn).getTime()) /
                86400000,
            ),
            originalAmount: bookingData.totalAmount,
            newAmount: newTotalAmount,
            modificationType: "dates",
          })
        } catch (emailErr: any) {
          console.error("[Webhook] Email error:", emailErr.message)
        }
      }

      await markProcessed(event.id, { ok: true, bookingId, type })
      return NextResponse.json({ received: true, bookingId })
    }

    // Unhandled event type
    console.log("[Webhook] Unhandled event:", event.type)
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Webhook] Handler error:", error.message)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
