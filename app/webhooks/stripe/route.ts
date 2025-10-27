import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Firestore (Admin)
const db = admin.firestore()

async function alreadyProcessed(eventId: string) {
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  const snap = await ref.get()
  return snap.exists
}
async function markProcessed(eventId: string, payload: any) {
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  await ref.set(
    { receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload },
    { merge: true },
  )
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = (await headers()).get("stripe-signature")
    if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 })

    // Verifica firma
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Evita doppi processamenti
    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // (opzionale) Separa test/live per sicurezza
    // if (process.env.NODE_ENV === "production" && event.livemode !== true) {
    //   await markProcessed(event.id, { ignored: "test_on_prod" })
    //   return NextResponse.json({ received: true })
    // }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // ✅ fallback robusto
      const bookingId =
        session.metadata?.bookingId ||
        session.client_reference_id ||
        null

      const customerEmail =
        session.customer_email ||
        session.customer_details?.email ||
        session.metadata?.email ||
        ""

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

      // ✅ aggiorna prenotazione
      await bookingRef.update({
        status: "paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // ✅ crea/collega utente
      let uid = ""
      try {
        const user = await admin.auth().getUserByEmail(bookingData.email)
        uid = user.uid
      } catch {
        const user = await admin.auth().createUser({
          email: bookingData.email,
          displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
        })
        uid = user.uid
        const resetLink = await admin.auth().generatePasswordResetLink(bookingData.email)
        await bookingRef.update({ passwordResetLink: resetLink })
      }

      await bookingRef.update({
        userId: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // (opzionale) invio email: chiama qui il tuo helper se vuoi
      // try {
      //   const afterSnap = await bookingRef.get()
      //   const after = afterSnap.data() as any
      //   const resetLink = after?.passwordResetLink
      //   await sendBookingConfirmationEmail({ ...bookingData, resetLink })
      // } catch (e) {
      //   console.error("[Webhook] Email send error:", e)
      // }

      await markProcessed(event.id, { ok: true, bookingId })
      return NextResponse.json({ received: true, bookingId })
    }

    // Altri event types non gestiti
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Webhook Handler Error]:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}



