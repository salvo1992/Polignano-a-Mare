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

    console.log("[v0] Syncing bookings from Beds24...")

    // Fetch bookings from Beds24
    const beds24Bookings = await beds24Client.getBookings(from, to)

    console.log(`[v0] Found ${beds24Bookings.length} bookings from Beds24`)

    let syncedCount = 0
    let skippedCount = 0

    for (const booking of beds24Bookings) {
      // Skip if not from Airbnb or Booking.com
      const source = booking.referer.toLowerCase()
      if (!["airbnb", "booking"].includes(source)) {
        continue
      }

      // Check if booking already exists in Firebase
      const bookingsRef = collection(db, "bookings")
      const q = query(
        bookingsRef,
        where("checkIn", "==", booking.arrival),
        where("checkOut", "==", booking.departure),
        where("roomId", "==", booking.roomId),
        where("origin", "==", source),
      )

      const existingBookings = await getDocs(q)

      if (!existingBookings.empty) {
        console.log(`[v0] Booking already exists: ${booking.id}`)
        skippedCount++
        continue
      }

      // Map Beds24 booking to Firebase booking format
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

      // Save to Firebase
      const bookingRef = doc(collection(db, "bookings"))
      await setDoc(bookingRef, firebaseBooking)

      console.log(`[v0] Synced booking: ${booking.id} from ${source}`)
      syncedCount++
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
      { error: "Failed to sync bookings", details: error instanceof Error ? error.message : "Unknown error" },
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
  // Map Beds24 room IDs to room names
  // You'll need to update this mapping based on your actual Beds24 room IDs
  const roomMap: Record<string, string> = {
    "1": "Camera Familiare con Balcone",
    "2": "Camera Matrimoniale con Vasca Idromassaggio",
  }
  return roomMap[roomId] || "Camera Sconosciuta"
}
