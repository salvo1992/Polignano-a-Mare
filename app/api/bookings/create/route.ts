import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Helper: get all unavailable date strings for a given room.
 * Checks bookings, blocked_dates, and smoobu_bookings collections.
 */
async function getUnavailableDatesForRoom(db: FirebaseFirestore.Firestore, roomId?: string): Promise<Set<string>> {
  const unavailable = new Set<string>()

  // 1. Active bookings
  const bookingsSnap = await db
    .collection("bookings")
    .where("status", "in", ["confirmed", "paid", "pending"])
    .get()

  bookingsSnap.forEach((doc) => {
    const booking = doc.data()
    if (roomId && booking.roomId && booking.roomId !== roomId) return

    const checkIn = new Date(booking.checkIn)
    const checkOut = new Date(booking.checkOut)
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return

    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      unavailable.add(d.toISOString().split("T")[0])
    }
  })

  // 2. Blocked dates (from Smoobu sync)
  try {
    const blockedSnap = await db.collection("blocked_dates").get()
    blockedSnap.forEach((doc) => {
      const blocked = doc.data()
      if (roomId && blocked.roomId && blocked.roomId !== roomId) return

      const from = new Date(blocked.startDate || blocked.from || blocked.arrival)
      const to = new Date(blocked.endDate || blocked.to || blocked.departure)
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return

      for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
        unavailable.add(d.toISOString().split("T")[0])
      }
    })
  } catch {
    // collection might not exist
  }

  // 3. Smoobu-synced bookings
  try {
    const smoobuSnap = await db.collection("smoobu_bookings").get()
    smoobuSnap.forEach((doc) => {
      const booking = doc.data()
      if (booking.status === "cancelled" || booking.status === "canceled") return
      if (roomId && booking.roomId && booking.roomId !== roomId) return

      const arrival = new Date(booking.arrival || booking.checkIn)
      const departure = new Date(booking.departure || booking.checkOut)
      if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return

      for (let d = new Date(arrival); d < departure; d.setDate(d.getDate() + 1)) {
        unavailable.add(d.toISOString().split("T")[0])
      }
    })
  } catch {
    // collection might not exist
  }

  return unavailable
}

/**
 * Check if a requested date range overlaps with any unavailable dates.
 */
function hasOverlap(checkIn: string, checkOut: string, unavailable: Set<string>): string[] {
  const conflicts: string[] = []
  const start = new Date(checkIn)
  const end = new Date(checkOut)

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    if (unavailable.has(dateStr)) {
      conflicts.push(dateStr)
    }
  }

  return conflicts
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      email,
      firstName,
      lastName,
      phone,
      checkIn,
      checkOut,
      guests,
      roomType,
      roomName,
      roomId,
      nights,
      pricePerNight,
      subtotal,
      taxes,
      serviceFee,
      totalAmount,
      specialRequests,
      userId,
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !checkIn || !checkOut || !guests || !roomType) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 })
    }

    // Validate dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: "Date non valide" }, { status: 400 })
    }

    if (checkInDate < now) {
      return NextResponse.json({ error: "La data di check-in non puo' essere nel passato" }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: "La data di check-out deve essere dopo il check-in" }, { status: 400 })
    }

    const db = getAdminDb()

    // SERVER-SIDE ANTI-DOUBLE-BOOKING CHECK
    // This is critical: check ALL sources of bookings before accepting
    console.log("[Create Booking] Checking availability for dates:", checkIn, "to", checkOut, "room:", roomId)

    const unavailableDates = await getUnavailableDatesForRoom(db, roomId || undefined)
    const conflicts = hasOverlap(checkIn, checkOut, unavailableDates)

    if (conflicts.length > 0) {
      console.warn("[Create Booking] BLOCKED - Date conflict detected:", conflicts)
      return NextResponse.json(
        {
          error: "Le date selezionate non sono disponibili. Alcune date sono gia' prenotate.",
          conflictDates: conflicts,
          code: "DATES_UNAVAILABLE",
        },
        { status: 409 }
      )
    }

    console.log("[Create Booking] Availability confirmed, creating booking...")

    // Create booking document
    const bookingRef = db.collection("bookings").doc()
    const bookingId = bookingRef.id

    const totalAmountEuros = Number(totalAmount)
    const bookingData = {
      bookingId,
      userId: userId || null,
      email,
      firstName,
      lastName,
      phone: phone || "",
      checkIn,
      checkOut,
      guests: Number(guests),
      roomType,
      roomName: roomName || roomType,
      roomId: roomId || null,
      nights: Number(nights),
      pricePerNight: Number(pricePerNight),
      subtotal: Number(subtotal),
      taxes: Number(taxes),
      serviceFee: Number(serviceFee || 0),
      totalAmount: totalAmountEuros, // Amount in euros
      totalAmountCents: Math.round(totalAmountEuros * 100), // Amount in cents for Stripe
      specialRequests: specialRequests || "",
      status: "pending",
      paymentProvider: null,
      paymentId: null,
      paidAt: null,
      smoobuReservationId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await bookingRef.set(bookingData)

    console.log("[Create Booking] Booking created:", bookingId)

    return NextResponse.json({
      success: true,
      bookingId,
      booking: bookingData,
    })
  } catch (error: any) {
    console.error("[Create Booking Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 500 })
  }
}
