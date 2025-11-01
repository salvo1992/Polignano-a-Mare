import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin, getFirestore } from "@/lib/firebase-admin"
import { sendBookingConfirmationEmail } from "@/lib/email"

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

      // ✅ aggiorna prenotazione
      await bookingRef.update({
        status: "paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("[Webhook] Booking updated to paid")

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
