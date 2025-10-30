import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore"

/**
 * Webhook endpoint for Beds24 to push real-time booking updates
 * This allows instant sync when bookings are made on Airbnb or Booking.com
 */
export async function POST(request: Request) {
  try {
    const data = await request.json()

    console.log("[v0] Received Beds24 webhook:", data)

    // Verify webhook signature if configured
    const signature = request.headers.get("x-beds24-signature")
    if (process.env.BEDS24_WEBHOOK_SECRET && signature) {
      // Implement signature verification here
      // This ensures the webhook is actually from Beds24
    }

    // Handle different webhook events
    const { event, booking } = data

    switch (event) {
      case "booking.created":
      case "booking.modified":
        await handleBookingUpdate(booking)
        break

      case "booking.cancelled":
        await handleBookingCancellation(booking)
        break

      default:
        console.log(`[v0] Unknown webhook event: ${event}`)
    }

    return NextResponse.json({ success: true, message: "Webhook processed" })
  } catch (error) {
    console.error("[v0] Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function handleBookingUpdate(booking: any) {
  const source = booking.referer?.toLowerCase()

  // Only process Airbnb and Booking.com bookings
  if (!["airbnb", "booking"].includes(source)) {
    console.log(`[v0] Skipping booking from source: ${source}`)
    return
  }

  // Check if booking already exists
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("beds24Id", "==", booking.id))
  const existingBookings = await getDocs(q)

  const firebaseBooking = {
    checkIn: booking.arrival,
    checkOut: booking.departure,
    guests: booking.numAdult + booking.numChild,
    guestFirst: booking.firstName,
    guestLast: booking.lastName,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes || "",
    total: booking.price,
    currency: "EUR",
    status: booking.status === "confirmed" ? "confirmed" : "pending",
    origin: source,
    roomId: booking.roomId,
    roomName: getRoomName(booking.roomId),
    beds24Id: booking.id,
    createdAt: new Date(booking.created).toISOString(),
    syncedAt: new Date().toISOString(),
  }

  if (existingBookings.empty) {
    // Create new booking
    const bookingRef = doc(collection(db, "bookings"))
    await setDoc(bookingRef, firebaseBooking)
    console.log(`[v0] Created new booking from webhook: ${booking.id}`)
  } else {
    // Update existing booking
    const existingDoc = existingBookings.docs[0]
    await setDoc(doc(db, "bookings", existingDoc.id), firebaseBooking, { merge: true })
    console.log(`[v0] Updated existing booking from webhook: ${booking.id}`)
  }
}

async function handleBookingCancellation(booking: any) {
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("beds24Id", "==", booking.id))
  const existingBookings = await getDocs(q)

  if (!existingBookings.empty) {
    const existingDoc = existingBookings.docs[0]
    await setDoc(
      doc(db, "bookings", existingDoc.id),
      {
        status: "cancelled",
        syncedAt: new Date().toISOString(),
      },
      { merge: true },
    )
    console.log(`[v0] Cancelled booking from webhook: ${booking.id}`)
  }
}

function getRoomName(roomId: string): string {
  const roomMap: Record<string, string> = {
    "1": "Camera Familiare con Balcone",
    "2": "Camera Matrimoniale con Vasca Idromassaggio",
  }
  return roomMap[roomId] || "Camera Sconosciuta"
}
