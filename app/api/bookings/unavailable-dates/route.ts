import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    const unavailableDates: Set<string> = new Set()

    // 1. Get all active bookings (confirmed, paid, pending)
    const bookingsRef = db.collection("bookings")
    let bookingsQuery = bookingsRef.where("status", "in", ["confirmed", "paid", "pending"])

    const bookingsSnap = await bookingsQuery.get()

    bookingsSnap.forEach((doc) => {
      const booking = doc.data()

      // If roomId filter is provided, only include bookings for that room
      if (roomId && booking.roomId && booking.roomId !== roomId) {
        return
      }

      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return

      // Add all dates between check-in and check-out (check-out day is free for new check-in)
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        unavailableDates.add(d.toISOString().split("T")[0])
      }
    })

    // 2. Get blocked_dates from Firebase (synced from Smoobu)
    try {
      const blockedRef = db.collection("blocked_dates")
      const blockedSnap = await blockedRef.get()

      blockedSnap.forEach((doc) => {
        const blocked = doc.data()

        // If roomId filter is provided, only include blocks for that room
        if (roomId && blocked.roomId && blocked.roomId !== roomId) {
          return
        }

        const from = new Date(blocked.startDate || blocked.from || blocked.arrival)
        const to = new Date(blocked.endDate || blocked.to || blocked.departure)

        if (isNaN(from.getTime()) || isNaN(to.getTime())) return

        for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
          unavailableDates.add(d.toISOString().split("T")[0])
        }
      })
    } catch (blockedError) {
      // blocked_dates collection might not exist yet - that's fine
      console.warn("[unavailable-dates] blocked_dates collection error:", blockedError)
    }

    // 3. Also check Smoobu-synced bookings that might have a different status field
    try {
      const smoobuBookingsRef = db.collection("smoobu_bookings")
      const smoobuSnap = await smoobuBookingsRef.get()

      smoobuSnap.forEach((doc) => {
        const booking = doc.data()

        // Skip cancelled bookings
        if (booking.status === "cancelled" || booking.status === "canceled") return

        // If roomId filter is provided, check room match
        if (roomId && booking.roomId && booking.roomId !== roomId) {
          return
        }

        const arrival = new Date(booking.arrival || booking.checkIn)
        const departure = new Date(booking.departure || booking.checkOut)

        if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return

        for (let d = new Date(arrival); d < departure; d.setDate(d.getDate() + 1)) {
          unavailableDates.add(d.toISOString().split("T")[0])
        }
      })
    } catch {
      // smoobu_bookings collection might not exist - that's fine
    }

    const sortedDates = [...unavailableDates].sort()

    return NextResponse.json({
      dates: sortedDates,
      count: sortedDates.length,
    })
  } catch (error) {
    console.error("[unavailable-dates] Error:", error)
    return NextResponse.json({ error: "Errore nel recupero delle date", dates: [] }, { status: 500 })
  }
}
