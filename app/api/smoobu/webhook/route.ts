import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { detectSourceFromChannelName } from "@/lib/smoobu-client"
import {
  getRoomName as centralGetRoomName,
  convertSmoobuApartmentIdToLocal as centralConvert,
  getRoomIdByName,
} from "@/lib/room-mapping"

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
  const db = getAdminDb()
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
  const existingBookings = await db.collection("bookings").where("smoobuId", "==", smoobuId).get()
  const roomId = getRoomIdByName(reservation.apartment?.name || "") ||
    convertSmoobuApartmentIdToLocal(reservation.apartment?.id?.toString())

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
    roomId,
    roomName: getRoomName(roomId),
    smoobuId: smoobuId,
    smoobuApartmentId: reservation.apartment?.id?.toString(),
    channelId: reservation.channel?.id,
    channelName: channelName || source,
    createdAt: reservation["created-at"] || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  }

  if (existingBookings.empty) {
    // Create new booking
    const bookingRef = db.collection("bookings").doc()
    await bookingRef.set(firebaseBooking)
    console.log(`[Smoobu] Created new booking from webhook: ${smoobuId}`)

    // Also create a blocked_dates entry so calendar immediately blocks these dates
    try {
      const blockRef = db.collection("blocked_dates").doc()
      await blockRef.set({
        roomId: firebaseBooking.roomId,
        from: reservation.arrival,
        to: reservation.departure,
        reason: `auto-booking: ${firebaseBooking.guestFirst} ${firebaseBooking.guestLast} (Smoobu: ${smoobuId})`,
        syncedToSmoobu: true,
        smoobuReservationId: smoobuId,
        createdAt: new Date().toISOString(),
      })
      console.log(`[Smoobu] blocked_dates entry created from webhook for: ${reservation.arrival} -> ${reservation.departure}`)
    } catch (blockErr) {
      console.error(`[Smoobu] Error creating blocked_dates entry:`, blockErr)
    }
  } else {
    // Update existing booking
    const existingDoc = existingBookings.docs[0]
    await existingDoc.ref.set(firebaseBooking, { merge: true })
    console.log(`[Smoobu] Updated existing booking from webhook: ${smoobuId}`)
  }
}

async function handleBookingCancellation(reservation: any) {
  const db = getAdminDb()
  const smoobuId = reservation.id?.toString()

  const existingBookings = await db.collection("bookings").where("smoobuId", "==", smoobuId).get()

  if (!existingBookings.empty) {
    const existingDoc = existingBookings.docs[0]
    await existingDoc.ref.set(
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
  return centralGetRoomName(roomId)
}

function convertSmoobuApartmentIdToLocal(smoobuApartmentId: string | undefined): string {
  if (!smoobuApartmentId) return ""
  // Try resolving via apartment name matching (Acies->1, Aquarum->2)
  return centralConvert(smoobuApartmentId)
}

