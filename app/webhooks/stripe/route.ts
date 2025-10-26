import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// util: idempotenza su Firestore
async function alreadyProcessed(eventId: string) {
  const ref = admin.firestore().doc(`stripe_webhook_events/${eventId}`)
  const snap = await ref.get()
  return snap.exists
}
async function markProcessed(eventId: string, payload: any) {
  const ref = admin.firestore().doc(`stripe_webhook_events/${eventId}`)
  await ref.set({ receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload }, { merge: true })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = (await headers()).get("stripe-signature")
    if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error("[v0] Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // idempotenza
    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({ received: true, dedup: true })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId
      const customerEmail =
        session.customer_email || session.customer_details?.email || session.metadata?.email || ""

      if (!bookingId) {
        console.error("[v0] No bookingId in metadata")
        await markProcessed(event.id, { error: "no bookingId" })
        return NextResponse.json({ error: "No bookingId" }, { status: 400 })
      }

      if (session.payment_status !== "paid") {
        await markProcessed(event.id, { status: session.payment_status })
        return NextResponse.json({ received: true, status: "payment_not_paid" })
      }

      const db = admin.firestore()
      const bookingRef = db.doc(`bookings/${bookingId}`)
      const bookingSnap = await bookingRef.get()
      if (!bookingSnap.exists) {
        console.error("[v0] Booking not found:", bookingId)
        await markProcessed(event.id, { error: "booking_not_found" })
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      const bookingData = bookingSnap.data() as any

      // 1) aggiorna prenotazione come pagata
      await bookingRef.update({
        status: "paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // 2) crea utente se non esiste (Admin SDK) e collega la prenotazione
      let uid = ""
      try {
        const user = await admin.auth().getUserByEmail(bookingData.email)
        uid = user.uid
      } catch {
        const user = await admin.auth().createUser({
          email: bookingData.email,
          displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
          emailVerified: false,
        })
        uid = user.uid
        // genera link impostazione password
        const resetLink = await admin.auth().generatePasswordResetLink(bookingData.email)
        await bookingRef.update({ passwordResetLink: resetLink })
      }

      // collega prenotazione all’utente
      await bookingRef.update({
        userId: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // 3) invia email conferma (usa il tuo helper; qui passo resetLink se presente)
      try {
        const snap2 = await bookingRef.get()
        const updated = snap2.data() as any
        const resetLink: string | undefined = updated?.passwordResetLink

        // usa la tua funzione esistente, ma passa il link se vuoi mostrarlo nell’email
        // (adatta la tua sendBookingConfirmationEmail a ricevere resetLink)
        // Esempio: await sendBookingConfirmationEmail({... , resetLink})

      } catch (e) {
        console.error("[v0] Email send error:", e)
      }

      await markProcessed(event.id, { ok: true, bookingId })
      return NextResponse.json({ received: true, bookingId })
    }

    // altri eventi se ti servono
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

