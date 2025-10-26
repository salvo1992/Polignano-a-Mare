import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Configura Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Firestore reference (Admin)
const db = admin.firestore()

// Funzione per controllare se un evento è già stato processato
async function alreadyProcessed(eventId: string) {
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  const snap = await ref.get()
  return snap.exists
}

// Funzione per segnare un evento come elaborato
async function markProcessed(eventId: string, payload: any) {
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  await ref.set(
    { receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload },
    { merge: true }
  )
}

// --- Webhook principale ---
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = (await headers()).get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verifica la firma
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Evita elaborazioni duplicate
    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Gestisci l’evento "checkout.session.completed"
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId
      const customerEmail =
        session.customer_email ||
        session.customer_details?.email ||
        session.metadata?.email ||
        ""

      if (!bookingId) {
        console.error("[Webhook] Missing bookingId in metadata")
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

      // 🔹 Aggiorna prenotazione come pagata
      await bookingRef.update({
        status: "paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // 🔹 Gestione utente (crea o collega)
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

      // 🔹 Collega la prenotazione all’utente
      await bookingRef.update({
        userId: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // 🔹 (Opzionale) Invia email di conferma se hai helper personalizzato
      try {
        const updatedSnap = await bookingRef.get()
        const updatedData = updatedSnap.data() as any
        const resetLink = updatedData?.passwordResetLink

        // Se hai una funzione sendBookingConfirmationEmail, la richiami qui
        // await sendBookingConfirmationEmail({ ...bookingData, resetLink })
      } catch (err) {
        console.error("[Webhook] Email send error:", err)
      }

      await markProcessed(event.id, { ok: true, bookingId })
      return NextResponse.json({ received: true, bookingId })
    }

    // Altri tipi di evento (puoi gestirli se ti servono)
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Webhook Handler Error]:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}


