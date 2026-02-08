import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore"
import { detectSourceFromChannelName } from "@/lib/smoobu-client"

/**
 * Webhook endpoint for Smoobu to push real-time booking updates
 * This allows instant sync when bookings are made on Airbnb or Booking.com
 * 
 * Configure in Smoobu: Settings -> Webhooks -> Add webhook URL
 * URL: https://yourdomain.com/api/smoobu/webhook
 */
export async function POST(request: Request) {
  try {
    const data = await request.json()

    console.log("[Smoobu] Received webhook:", JSON.stringify(data, null, 2))

    // Smoobu webhook structure
    const { action, data: reservationData } = data

    switch (action) {
      case "newReservation":
      case "updateReservation":
        await handleBookingUpdate(reservationData)
        break

      case "cancelReservation":
        await handleBookingCancellation(reservationData)
        break

      default:
        console.log(`[Smoobu] Unknown webhook action: ${action}`)
    }

    return NextResponse.json({ success: true, message: "Webhook processed" })
  } catch (error) {
    console.error("[Smoobu] Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function handleBookingUpdate(reservation: any) {
  const channelName = reservation.channel?.name || ""
  
  // Determine source from channel NAME (channel IDs are dynamic per Smoobu user)
  const source = detectSourceFromChannelName(channelName)

  // Skip blocked bookings
  if (reservation["is-blocked-booking"]) {
    console.log(`[Smoobu] Skipping blocked booking`)
    return
  }

  const smoobuId = reservation.id?.toString()

  // Check if booking already exists
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("smoobuId", "==", smoobuId))
  const existingBookings = await getDocs(q)

  const firebaseBooking = {
    checkIn: reservation.arrival,
    checkOut: reservation.departure,
    guests: (reservation.adults || 1) + (reservation.children || 0),
    guestFirst: reservation.firstname || reservation["guest-name"]?.split(" ")[0] || "",
    guestLast: reservation.lastname || reservation["guest-name"]?.split(" ").slice(1).join(" ") || "",
    email: reservation.email || "",
    phone: reservation.phone || "",
    notes: reservation.notice || "",
    total: reservation.price || 0,
    currency: "EUR",
    status: "confirmed",
    origin: source,
    roomId: convertSmoobuApartmentIdToLocal(reservation.apartment?.id?.toString()),
    roomName: reservation.apartment?.name || getRoomName(reservation.apartment?.id?.toString()),
    smoobuId: smoobuId,
    smoobuApartmentId: reservation.apartment?.id?.toString(),
    channelId: reservation.channel?.id,
    channelName: channelName || source,
    createdAt: reservation["created-at"] || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  }

  if (existingBookings.empty) {
    // Create new booking
    const bookingRef = doc(collection(db, "bookings"))
    await setDoc(bookingRef, firebaseBooking)
    console.log(`[Smoobu] Created new booking from webhook: ${smoobuId}`)
  } else {
    // Update existing booking
    const existingDoc = existingBookings.docs[0]
    await setDoc(doc(db, "bookings", existingDoc.id), firebaseBooking, { merge: true })
    console.log(`[Smoobu] Updated existing booking from webhook: ${smoobuId}`)
  }
}

async function handleBookingCancellation(reservation: any) {
  const smoobuId = reservation.id?.toString()

  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("smoobuId", "==", smoobuId))
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
    console.log(`[Smoobu] Cancelled booking from webhook: ${smoobuId}`)
  }
}

function getRoomName(roomId: string | undefined): string {
  if (!roomId) return "Camera Sconosciuta"
  const roomMap: Record<string, string> = {
    "2": "Camera Familiare con Balcone",
    "3": "Camera Matrimoniale con Vasca Idromassaggio",
  }
  return roomMap[roomId] || "Camera Sconosciuta"
}

// TODO: Update this mapping with your Smoobu apartment IDs
function convertSmoobuApartmentIdToLocal(smoobuApartmentId: string | undefined): string {
  if (!smoobuApartmentId) return ""
  const apartmentIdMap: Record<string, string> = {
    // Add your Smoobu apartment ID mappings here
  }
  return apartmentIdMap[smoobuApartmentId] || smoobuApartmentId
}

