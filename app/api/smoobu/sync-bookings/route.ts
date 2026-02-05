import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore"

/**
 * Sync bookings from Smoobu to Firebase
 * This endpoint fetches all reservations from Smoobu and syncs them to Firebase
 * Prevents double bookings by checking existing bookings
 * Supports filtering by source: booking or airbnb
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { from, to, source } = body

    console.log(`[Smoobu] Fetching bookings - Source: ${source || "all"}`)

    let smoobuBookings: any[] = []

    if (source === "booking") {
      smoobuBookings = await smoobuClient.getBookingComBookings(from, to)
    } else if (source === "airbnb") {
      smoobuBookings = await smoobuClient.getAirbnbBookings(from, to)
    } else if (source === "expedia") {
      smoobuBookings = await smoobuClient.getExpediaBookings(from, to)
    } else if (source === "direct") {
      smoobuBookings = await smoobuClient.getDirectBookings(from, to)
    } else {
      smoobuBookings = await smoobuClient.getBookings(from, to)
    }

    console.log(`[Smoobu] Retrieved ${smoobuBookings.length} bookings`)

    // Count bookings by source (using referer which is based on channel NAME)
    const breakdown = smoobuBookings.reduce(
      (acc, booking) => {
        const source = booking.referer || "other"
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    console.log(`[Smoobu] Bookings by source:`, breakdown)

    const bookingCount = breakdown["booking"] || 0
    const airbnbCount = breakdown["airbnb"] || 0
    const expediaCount = breakdown["expedia"] || 0
    const directCount = breakdown["direct"] || 0
    const otherCount = Object.entries(breakdown)
      .filter(([src]) => !["booking", "airbnb", "expedia", "direct", "blocked"].includes(src))
      .reduce((sum, [, count]) => sum + count, 0)

    console.log(
      `[Smoobu] Breakdown - Booking.com: ${bookingCount}, Airbnb: ${airbnbCount}, Expedia: ${expediaCount}, Direct: ${directCount}, Other: ${otherCount}`,
    )

    let syncedCount = 0
    let skippedCount = 0

    for (const booking of smoobuBookings) {
      try {
        // Source is already correctly set in referer (from channel name detection)
        const bookingSource = booking.referer || "other"
        
        // Skip blocked bookings
        if (bookingSource === "blocked" || booking.status === "blocked") {
          skippedCount++
          continue
        }

        const checkInDate = parseDate(booking.arrival)
        const checkOutDate = parseDate(booking.departure)

        if (!checkInDate || !checkOutDate) {
          skippedCount++
          continue
        }

        const bookingsRef = collection(db, "bookings")

        // Check if booking already exists by smoobuId
        const q = query(bookingsRef, where("smoobuId", "==", booking.id))
        const existingBookings = await getDocs(q)

        if (!existingBookings.empty) {
          skippedCount++
          continue
        }

        // Check if booking already exists by date, room, and guest name
        const q2 = query(
          bookingsRef,
          where("checkIn", "==", checkInDate),
          where("checkOut", "==", checkOutDate),
          where("roomId", "==", booking.roomId),
          where("guestLast", "==", booking.lastName),
        )
        const existingBookings2 = await getDocs(q2)

        if (!existingBookings2.empty) {
          skippedCount++
          continue
        }

        // Convert Smoobu apartment ID to local room ID using apartment name
        const localRoomId = convertSmoobuApartmentIdToLocal(booking.roomId, booking.apartmentName)
        console.log(`[Smoobu] Processing booking ${booking.id} - Smoobu apartment: "${booking.apartmentName}" (${booking.roomId}), Local roomId: ${localRoomId}`)

        const firebaseBooking = {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: booking.numAdult + booking.numChild,
          guestFirst: booking.firstName,
          guestLast: booking.lastName,
          email: booking.email,
          phone: booking.phone,
          notes: booking.notes || "",
          total: booking.price,
          currency: "EUR",
          status: booking.status === "blocked" ? "blocked" : "confirmed",
          origin: bookingSource,
          roomId: localRoomId,
          roomName: getRoomName(localRoomId),
          smoobuId: booking.id,
          smoobuApartmentId: booking.roomId,
          channelId: booking.apiSourceId,
          channelName: booking.apiSource,
          createdAt: parseDate(booking.created) || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        }

        const bookingRef = doc(collection(db, "bookings"))
        await setDoc(bookingRef, firebaseBooking)

        console.log(`[Smoobu] Synced booking ${booking.id} from ${bookingSource} (channelId: ${booking.apiSourceId})`)
        syncedCount++
      } catch (bookingError) {
        console.error(`[Smoobu] Error processing booking ${booking.id}:`, bookingError)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: smoobuBookings.length,
      source: source || "all",
      breakdown: {
        booking: bookingCount,
        airbnb: airbnbCount,
        expedia: expediaCount,
        direct: directCount,
        other: otherCount,
      },
    })
  } catch (error) {
    console.error("[Smoobu] Error syncing bookings:", error)
    return NextResponse.json(
      {
        error: "Failed to sync bookings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Get bookings from Smoobu (without syncing)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const source = searchParams.get("source") || undefined

    let bookings

    if (source === "booking") {
      bookings = await smoobuClient.getBookingComBookings(from, to)
    } else if (source === "airbnb") {
      bookings = await smoobuClient.getAirbnbBookings(from, to)
    } else if (source === "expedia") {
      bookings = await smoobuClient.getExpediaBookings(from, to)
    } else if (source === "direct") {
      bookings = await smoobuClient.getDirectBookings(from, to)
    } else {
      bookings = await smoobuClient.getBookings(from, to)
    }

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      source: source || "all",
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching bookings:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function getRoomName(roomId: string): string {
  const roomMap: Record<string, string> = {
  "1": "Camera Familiare con Balcone",
  "2": "Camera Matrimoniale con Vasca Idromassaggio",
  }
  return roomMap[roomId] || "Camera Sconosciuta"
  }

function parseDate(dateString: string | undefined): string | null {
  if (!dateString) return null

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString + "T00:00:00.000Z")
      if (isNaN(date.getTime())) return null
      return date.toISOString()
    }

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch (error) {
    console.error(`[Smoobu] Error parsing date: ${dateString}`, error)
    return null
  }
}

  // Map Smoobu apartment name to Firebase room ID
  // Smoobu apartment IDs are dynamic, so we use the apartment name
  const SMOOBU_NAME_TO_ROOM_ID: Record<string, string> = {
    "acies": "1",     // Acies -> Camera Familiare (Firebase roomId "1")
    "aquarum": "2",   // Aquarum -> Camera Matrimoniale (Firebase roomId "2")
  }

  function convertSmoobuApartmentIdToLocal(smoobuApartmentId: string, apartmentName?: string): string {
    // First try matching by apartment name (most reliable)
    if (apartmentName) {
      const normalized = apartmentName.toLowerCase().trim()
      if (SMOOBU_NAME_TO_ROOM_ID[normalized]) {
        return SMOOBU_NAME_TO_ROOM_ID[normalized]
      }
      // Partial match
      for (const [key, roomId] of Object.entries(SMOOBU_NAME_TO_ROOM_ID)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return roomId
        }
      }
    }
    // Fallback: return the Smoobu ID as-is
    console.warn(`[Smoobu] Could not map apartment "${apartmentName}" (ID: ${smoobuApartmentId}) to a Firebase roomId`)
    return smoobuApartmentId
  }
