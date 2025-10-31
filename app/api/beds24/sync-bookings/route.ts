import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore"

/**
 * Sync bookings from Beds24 to Firebase
 * This endpoint fetches all bookings from Beds24 and syncs them to Firebase
 * Prevents double bookings by checking existing bookings
 */
export async function POST(request: Request) {
  try {
    const { from, to } = await request.json()

    const beds24Bookings = await beds24Client.getBookings(from, to)

    let syncedCount = 0
    let skippedCount = 0

    for (const booking of beds24Bookings) {
      try {
        const refererLower = booking.referer?.toLowerCase() || ""
        let source: string

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
          source = "booking"
        } else if (isAirbnb) {
          source = "airbnb"
        } else {
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
        const q = query(bookingsRef, where("beds24Id", "==", booking.id))
        const existingBookings = await getDocs(q)

        if (!existingBookings.empty) {
          skippedCount++
          continue
        }

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
          origin: source,
          roomId: booking.roomId.toString(),
          roomName: getRoomName(booking.roomId.toString()),
          beds24Id: booking.id,
          createdAt: parseDate(booking.created) || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        }

        const bookingRef = doc(collection(db, "bookings"))
        await setDoc(bookingRef, firebaseBooking)

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
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined

    const bookings = await beds24Client.getBookings(from, to)

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
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

