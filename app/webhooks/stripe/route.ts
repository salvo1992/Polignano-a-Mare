import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin, getFirestore } from "@/lib/firebase-admin"
import { sendBookingConfirmationEmail, sendModificationEmail } from "@/lib/email"

export const runtime = "nodejs"

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function alreadyProcessed(eventId: string) {
  const db = getFirestore()
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  const snap = await ref.get()
  return snap.exists
}
async function markProcessed(eventId: string, payload: any) {
  const db = getFirestore()
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  await ref.set({ receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload }, { merge: true })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = (await headers()).get("stripe-signature")
    if (!signature) {
      console.error("[Webhook] No signature provided")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verifica firma
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log("[Webhook] Event received:", event.type, "ID:", event.id)

    // Evita doppi processamenti
    if (await alreadyProcessed(event.id)) {
      console.log("[Webhook] Event already processed:", event.id)
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (event.type === "checkout.session.completed") {
      const db = getFirestore()
      const session = event.data.object as Stripe.Checkout.Session

      // ✅ fallback robusto
      const bookingId = session.metadata?.bookingId || session.client_reference_id || null

      const customerEmail = session.customer_email || session.customer_details?.email || session.metadata?.email || ""

      console.log("[Webhook] checkout.session.completed", {
        livemode: event.livemode,
        bookingId,
        email: customerEmail,
        payment_status: session.payment_status,
      })

      if (!bookingId) {
        console.error("[Webhook] Missing bookingId (metadata/client_reference_id)")
        await markProcessed(event.id, { error: "no bookingId" })
        return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
      }

      if (session.payment_status !== "paid") {
        console.log("[Webhook] Payment not completed:", session.payment_status)
        await markProcessed(event.id, { status: session.payment_status })
        return NextResponse.json({ received: true, status: "payment_not_paid" })
      }

      const bookingRef = db.doc(`bookings/${bookingId}`)
      const bookingSnap = await bookingRef.get()
      if (!bookingSnap.exists) {
        console.error("[Webhook] Booking not found:", bookingId)
        await markProcessed(event.id, { error: "booking_not_found" })
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      const bookingData = bookingSnap.data() as any
      console.log("[Webhook] Booking found:", bookingId, "Email:", bookingData.email)

      const paymentType = session.metadata?.type || session.metadata?.paymentType || "deposit"

      if (paymentType === "change_dates") {
        console.log("[Webhook] Processing change_dates payment")
        console.log("[Webhook] Session metadata:", session.metadata)

        const newTotalAmount = Number.parseInt(session.metadata?.newTotalAmount || "0")
        const depositAmount = Number.parseInt(session.metadata?.depositAmount || "0")
        const balanceAmount = Number.parseInt(session.metadata?.balanceAmount || "0")
        const checkIn = session.metadata?.checkIn
        const checkOut = session.metadata?.checkOut
        const penalty = Number.parseInt(session.metadata?.penalty || "0")

        console.log("[Webhook] Parsed metadata:", {
          newTotalAmount: newTotalAmount / 100,
          depositAmount: depositAmount / 100,
          balanceAmount: balanceAmount / 100,
          penalty: penalty / 100,
          checkIn,
          checkOut,
        })

        const currentDepositPaid = bookingData.depositPaid || 0
        const currentBalanceDue = bookingData.balanceDue || 0

        console.log("[Webhook] Current booking state:", {
          currentDepositPaid: currentDepositPaid / 100,
          currentBalanceDue: currentBalanceDue / 100,
          currentTotalAmount: bookingData.totalAmount / 100,
        })

        const updateData = {
          checkIn,
          checkOut,
          totalAmount: newTotalAmount,
          depositPaid: currentDepositPaid + depositAmount,
          balanceDue: currentBalanceDue + balanceAmount,
          lastPayment: {
            type: "change_dates_deposit",
            amount: depositAmount,
            paymentId: String(session.payment_intent || session.id),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        console.log("[Webhook] Updating booking with:", {
          newDepositPaid: updateData.depositPaid / 100,
          newBalanceDue: updateData.balanceDue / 100,
          newTotalAmount: updateData.totalAmount / 100,
          newCheckIn: updateData.checkIn,
          newCheckOut: updateData.checkOut,
        })

        await bookingRef.update(updateData)

        console.log("[Webhook] Database updated successfully")

        console.log("[Webhook] Date change payment processed successfully")

        try {
          const nights = Math.ceil(
            (new Date(checkOut || bookingData.checkOut).getTime() -
              new Date(checkIn || bookingData.checkIn).getTime()) /
              (1000 * 60 * 60 * 24),
          )

          console.log("[Webhook] Sending date change confirmation email")
          await sendModificationEmail({
            to: bookingData.email,
            bookingId: bookingId,
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            checkIn: checkIn || bookingData.checkIn,
            checkOut: checkOut || bookingData.checkOut,
            roomName: bookingData.roomName,
            guests: bookingData.guests,
            nights,
            originalAmount: bookingData.totalAmount,
            newAmount: newTotalAmount,
            penalty: penalty > 0 ? penalty : undefined,
            dateChangeCost: balanceAmount + depositAmount,
            modificationType: "dates",
          })
          console.log("[Webhook] Date change confirmation email sent successfully")
        } catch (emailError: any) {
          console.error("[Webhook] Error sending date change email:", emailError.message)
        }

        await markProcessed(event.id, { ok: true, bookingId, type: "change_dates" })
        return NextResponse.json({ received: true, bookingId, type: "change_dates" })
      }

      if (paymentType === "balance") {
        // Handle balance payment
        console.log("[Webhook] Processing balance payment")

        const balanceAmount = session.amount_total || 0

        await bookingRef.update({
          status: "paid",
          balanceDue: 0,
          balancePaidAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPayment: {
            type: "balance",
            amount: balanceAmount,
            paymentId: String(session.payment_intent || session.id),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        console.log("[Webhook] Balance payment processed:", balanceAmount / 100)

        await markProcessed(event.id, { ok: true, bookingId, type: "balance" })
        return NextResponse.json({ received: true, bookingId, type: "balance" })
      }

      // Default: deposit payment for new booking
      const depositAmount = session.amount_total || 0
      const fullAmount = session.metadata?.fullAmount
        ? Number.parseInt(session.metadata.fullAmount)
        : bookingData.totalAmount
      const balanceDue = fullAmount - depositAmount

      await bookingRef.update({
        status: "deposit_paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paymentType: "deposit",
        depositPaid: depositAmount,
        balanceDue: balanceDue,
        totalAmount: fullAmount,
        depositPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("[Webhook] Deposit payment processed:", {
        depositPaid: depositAmount / 100,
        balanceDue: balanceDue / 100,
        totalAmount: fullAmount / 100,
      })

      // ✅ crea/collega utente
      let uid = ""
      let newPassword: string | undefined
      try {
        console.log("[Webhook] Checking if user exists:", bookingData.email)
        const user = await admin.auth().getUserByEmail(bookingData.email)
        uid = user.uid
        console.log("[Webhook] User already exists:", uid)
      } catch (userError: any) {
        console.log("[Webhook] User not found, creating new user:", bookingData.email)

        const generatePassword = () => {
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
          let password = ""
          for (let i = 0; i < 12; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length))
          }
          return password
        }

        newPassword = generatePassword()
        console.log("[Webhook] Generated password for new user")

        try {
          const newUser = await admin.auth().createUser({
            email: bookingData.email,
            password: newPassword,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
          })
          uid = newUser.uid
          console.log("[Webhook] User created in Firebase Auth:", uid)

          await db.doc(`users/${uid}`).set({
            uid: uid,
            email: bookingData.email,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            provider: "password",
            role: "user",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notifications: {
              confirmEmails: true,
              promos: false,
              checkinReminders: true,
            },
          })
          console.log("[Webhook] User data saved in Firestore")
        } catch (createError: any) {
          console.error("[Webhook] Error creating user:", createError.message, createError.code)
          throw createError
        }
      }

      await bookingRef.update({
        userId: uid,
        newUserPassword: newPassword || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("[Webhook] Booking updated with userId:", uid)
      console.log("[Webhook] New user password saved:", !!newPassword)
      if (newPassword) {
        console.log("[Webhook] Password length:", newPassword.length)
      }

      const updatedBookingSnap = await bookingRef.get()
      const updatedBookingData = updatedBookingSnap.data() as any
      console.log("[Webhook] Reloaded booking data, has newUserPassword:", !!updatedBookingData.newUserPassword)

      try {
        console.log("[Webhook] Attempting to send confirmation email to:", updatedBookingData.email)
        console.log("[Webhook] Email data:", {
          bookingId,
          firstName: updatedBookingData.firstName,
          lastName: updatedBookingData.lastName,
          hasNewPassword: !!newPassword,
          passwordLength: newPassword?.length,
        })

        const emailResult = await sendBookingConfirmationEmail({
          to: updatedBookingData.email,
          bookingId: bookingId,
          firstName: updatedBookingData.firstName,
          lastName: updatedBookingData.lastName,
          checkIn: updatedBookingData.checkIn,
          checkOut: updatedBookingData.checkOut,
          roomName: updatedBookingData.roomName,
          guests: updatedBookingData.guests,
          totalAmount: updatedBookingData.totalAmount,
          nights: updatedBookingData.nights,
          newUserPassword: newPassword,
        })
        console.log("[Webhook] Email send result:", emailResult)
        if (emailResult.success) {
          console.log("[Webhook] ✅ Confirmation email sent successfully")
        } else {
          console.error("[Webhook] ❌ Email send failed:", emailResult.error)
        }
      } catch (emailError: any) {
        console.error("[Webhook] ❌ Email send error:", emailError.message)
        console.error("[Webhook] Email error details:", emailError)
        // Don't fail the webhook if email fails
      }

      await markProcessed(event.id, { ok: true, bookingId, userCreated: !!newPassword })
      console.log("[Webhook] ✅ Webhook processing completed successfully")
      return NextResponse.json({ received: true, bookingId, userCreated: !!newPassword })
    }

    // Altri event types non gestiti
    console.log("[Webhook] Event type not handled:", event.type)
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Webhook Handler Error]:", error.message)
    console.error("[Webhook Handler Error Stack]:", error.stack)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
