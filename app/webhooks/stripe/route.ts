import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { createUserFromBooking, linkBookingToUser } from "@/lib/firebase"
import { sendBookingConfirmationEmail } from "@/lib/email"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("[v0] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("[v0] Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log("[v0] Stripe webhook event received:", event.type)

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log("[v0] Checkout session completed:", session.id)
      console.log("[v0] Payment status:", session.payment_status)
      console.log("[v0] Metadata:", session.metadata)

      // Get booking ID from metadata
      const bookingId = session.metadata?.bookingId

      if (!bookingId) {
        console.error("[v0] No bookingId in session metadata")
        return NextResponse.json({ error: "No bookingId in metadata" }, { status: 400 })
      }

      // Check if payment was successful
      if (session.payment_status === "paid") {
        try {
          // Get booking data
          const bookingRef = doc(db, "bookings", bookingId)
          const bookingSnap = await getDoc(bookingRef)

          if (!bookingSnap.exists()) {
            console.error("[v0] Booking not found:", bookingId)
            return NextResponse.json({ error: "Booking not found" }, { status: 404 })
          }

          const bookingData = bookingSnap.data()

          // Update booking status to paid
          await updateDoc(bookingRef, {
            status: "paid",
            paymentId: session.payment_intent as string,
            paymentProvider: "stripe",
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          console.log("[v0] Booking updated to paid:", bookingId)

          const userResult = await createUserFromBooking(bookingData.email, bookingData.firstName, bookingData.lastName)

          if (userResult.success) {
            // Link booking to user account
            await linkBookingToUser(bookingId, bookingData.email)

            // Store password in booking metadata if it was newly created
            if (userResult.password) {
              await updateDoc(bookingRef, {
                newUserPassword: userResult.password, // Temporary storage for email
                updatedAt: serverTimestamp(),
              })
              console.log("[v0] New user account created with password")
            }
          }

          // Send confirmation email
          const emailResult = await sendBookingConfirmationEmail({
            to: bookingData.email,
            bookingId: bookingId,
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            roomName: bookingData.roomName,
            guests: bookingData.guests,
            totalAmount: bookingData.totalAmount,
            nights: bookingData.nights,
            newUserPassword: userResult.password,
          })

          if (emailResult.success) {
            console.log("[v0] Confirmation email sent successfully")
            // Remove password from booking after email is sent
            if (userResult.password) {
              await updateDoc(bookingRef, {
                newUserPassword: null,
                updatedAt: serverTimestamp(),
              })
            }
          } else {
            console.error("[v0] Failed to send confirmation email:", emailResult.error)
          }

          return NextResponse.json({ received: true, bookingId, emailSent: emailResult.success })
        } catch (error) {
          console.error("[v0] Error processing webhook:", error)
          return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
        }
      } else {
        console.log("[v0] Payment not completed, status:", session.payment_status)
        return NextResponse.json({ received: true, status: "payment_pending" })
      }
    }

    // Handle other event types if needed
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
