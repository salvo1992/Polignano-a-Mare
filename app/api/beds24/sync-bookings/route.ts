import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore"

/**
 * Sync bookings from Beds24 to Firebase
 * This endpoint fetches all bookings from Beds24 and syncs them to Firebase
 * Prevents double bookings by checking existing bookings
 * Supports filtering by source: booking (apiSourceId=19) or airbnb (apiSourceId=10 and 46)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { from, to, source } = body

    console.log(`[v0] Fetching bookings from Beds24 - Source: ${source || "all"}`)

    let beds24Bookings: any[] = []

    if (source === "booking") {
      beds24Bookings = await beds24Client.getBookingComBookings(from, to)
    } else if (source === "airbnb") {
      beds24Bookings = await beds24Client.getAirbnbBookings(from, to)
    } else {
      beds24Bookings = await beds24Client.getBookings(from, to, true)
    }

    console.log(`[v0] Retrieved ${beds24Bookings.length} bookings from Beds24`)

    const breakdown = beds24Bookings.reduce(
      (acc, booking) => {
        const sourceId = booking.apiSourceId || 0
        acc[sourceId] = (acc[sourceId] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    console.log(`[v0] Bookings by apiSourceId:`, breakdown)

    const bookingCount = breakdown[19] || 0
    const airbnbIcalCount = breakdown[10] || 0
    const airbnbXmlCount = breakdown[46] || 0
    const airbnbTotal = airbnbIcalCount + airbnbXmlCount
    const otherCount = Object.entries(breakdown)
      .filter(([id]) => !["19", "10", "46"].includes(id))
      .reduce((sum, [, count]) => sum + count, 0)

    console.log(
      `[v0] Breakdown - Booking.com: ${bookingCount}, Airbnb (iCal): ${airbnbIcalCount}, Airbnb (XML): ${airbnbXmlCount}, Airbnb Total: ${airbnbTotal}, Other: ${otherCount}`,
    )

    let syncedCount = 0
    let skippedCount = 0

    for (const booking of beds24Bookings) {
      try {
        let bookingSource: string

        if (booking.apiSourceId === 19) {
          bookingSource = "booking"
        } else if (booking.apiSourceId === 10 || booking.apiSourceId === 46) {
          bookingSource = "airbnb"
        } else {
          // Fallback to referer if apiSourceId is not available
          const refererLower = booking.referer?.toLowerCase() || ""
          const isBooking =
            refererLower.includes("booking") ||
            refererLower.includes("booking.com") ||
            refererLower.includes("bookingcom") ||
            refererLower === "booking"

          const isAirbnb =
            refererLower.includes("airbnb") ||
            refererLower.includes("air bnb") ||
            refererLower.includes("air-bnb") ||
            refererLower === "airbnb"

          if (isBooking) {
            bookingSource = "booking"
          } else if (isAirbnb) {
            bookingSource = "airbnb"
          } else {
            // Skip bookings that are not from Booking.com or Airbnb
            console.log(
              `[v0] Skipping booking ${booking.id} - Unknown source (apiSourceId: ${booking.apiSourceId}, referer: ${booking.referer})`,
            )
            skippedCount++
            continue
          }
        }

        const checkInDate = parseDate(booking.arrival)
        const checkOutDate = parseDate(booking.departure)

        if (!checkInDate || !checkOutDate) {
          skippedCount++
          continue
        }

        const bookingsRef = collection(db, "bookings")

        // Check if booking already exists by beds24Id
        const q = query(bookingsRef, where("beds24Id", "==", booking.id))
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
          roomId: booking.roomId.toString(),
          roomName: getRoomName(booking.roomId.toString()),
          beds24Id: booking.id,
          apiSourceId: booking.apiSourceId,
          apiSource: booking.apiSource,
          createdAt: parseDate(booking.created) || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        }

        const bookingRef = doc(collection(db, "bookings"))
        await setDoc(bookingRef, firebaseBooking)

        console.log(`[v0] Synced booking ${booking.id} from ${bookingSource} (apiSourceId: ${booking.apiSourceId})`)
        syncedCount++
      } catch (bookingError) {
        console.error(`[v0] Error processing booking ${booking.id}:`, bookingError)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: beds24Bookings.length,
      source: source || "all",
      breakdown: {
        booking: bookingCount,
        airbnbIcal: airbnbIcalCount,
        airbnbXml: airbnbXmlCount,
        airbnbTotal,
        other: otherCount,
      },
    })
  } catch (error) {
    console.error("[v0] Error syncing bookings:", error)
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
 * Get bookings from Beds24 (without syncing)
 * Query params:
 * - from: Start date (YYYY-MM-DD)
 * - to: End date (YYYY-MM-DD)
 * - source: Filter by source ('booking' or 'airbnb')
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const source = searchParams.get("source") || undefined

    let apiSourceId: number | undefined
    if (source === "booking") {
      apiSourceId = 19 // Booking.com
    } else if (source === "airbnb") {
      apiSourceId = 46 // Airbnb
    }

    const bookings = await beds24Client.getBookings(from, to, true, apiSourceId)

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      source: source || "all",
    })
  } catch (error) {
    console.error("[v0] Error fetching bookings:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function getRoomName(roomId: string): string {
  const roomMap: Record<string, string> = {
    "621530": "Camera Familiare con Balcone",
    "621531": "Camera Matrimoniale con Vasca Idromassaggio",
  }
  return roomMap[roomId] || "Camera Sconosciuta"
}

// Helper function to parse dates safely
function parseDate(dateString: string | undefined): string | null {
  if (!dateString) return null

  try {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString + "T00:00:00.000Z")
      if (isNaN(date.getTime())) return null
      return date.toISOString()
    }

    // Handle ISO format or timestamp
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch (error) {
    console.error(`[v0] Error parsing date: ${dateString}`, error)
    return null
  }
}



