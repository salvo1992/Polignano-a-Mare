import { NextResponse } from "next/server"
import { smoobuClient, SMOOBU_CHANNELS } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore"

/**
 * Sync bookings from Smoobu to Firebase
 * This endpoint fetches all bookings from Smoobu and syncs them to Firebase
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
    } else {
      smoobuBookings = await smoobuClient.getBookings(from, to)
    }

    console.log(`[Smoobu] Retrieved ${smoobuBookings.length} bookings`)

    const breakdown = smoobuBookings.reduce(
      (acc, booking) => {
        const sourceId = booking.apiSourceId || 0
        acc[sourceId] = (acc[sourceId] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    console.log(`[Smoobu] Bookings by channel:`, breakdown)

    const bookingCount = breakdown[SMOOBU_CHANNELS.BOOKING_COM] || 0
    const airbnbCount = breakdown[SMOOBU_CHANNELS.AIRBNB] || 0
    const directCount = breakdown[SMOOBU_CHANNELS.DIRECT] || 0
    const otherCount = Object.entries(breakdown)
      .filter(([id]) => ![String(SMOOBU_CHANNELS.BOOKING_COM), String(SMOOBU_CHANNELS.AIRBNB), String(SMOOBU_CHANNELS.DIRECT)].includes(id))
      .reduce((sum, [, count]) => sum + count, 0)

    console.log(
      `[Smoobu] Breakdown - Booking.com: ${bookingCount}, Airbnb: ${airbnbCount}, Direct: ${directCount}, Other: ${otherCount}`,
    )

    let syncedCount = 0
    let skippedCount = 0

    for (const booking of smoobuBookings) {
      try {
        let bookingSource: string = booking.referer || "direct"

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
          where("roomId", "==", booking.roomId.toString()),
          where("guestLast", "==", booking.lastName),
        )
        const existingBookings2 = await getDocs(q2)

        if (!existingBookings2.empty) {
          skippedCount++
          continue
        }

        const localRoomId = convertSmoobuRoomIdToLocal(booking.roomId.toString())
        console.log(`[Smoobu] Processing booking ${booking.id} - Smoobu roomId: ${booking.roomId}, Local roomId: ${localRoomId}`)

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
          status: booking.status === "confirmed" ? "confirmed" : "pending",
          origin: bookingSource,
          roomId: localRoomId,
          roomName: getRoomName(localRoomId),
          smoobuId: booking.id,
          smoobuRoomId: booking.roomId.toString(),
          apiSourceId: booking.apiSourceId,
          apiSource: booking.apiSource,
          createdAt: parseDate(booking.created) || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        }

        const bookingRef = doc(collection(db, "bookings"))
        await setDoc(bookingRef, firebaseBooking)

        console.log(`[Smoobu] Synced booking ${booking.id} from ${bookingSource}`)
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
    "2": "Camera Familiare con Balcone",
    "3": "Camera Matrimoniale con Vasca Idromassaggio",
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

function convertSmoobuRoomIdToLocal(smoobuRoomId: string): string {
  // Mappa i Smoobu apartment IDs ai room IDs locali
  // Dovrai aggiornare questa mappa con i tuoi ID reali da Smoobu
  const roomIdMap: Record<string, string> = {
    // Esempio: "123456": "2", // Camera Familiare
    // Esempio: "123457": "3", // Camera Matrimoniale
  }
  return roomIdMap[smoobuRoomId] || smoobuRoomId
}
