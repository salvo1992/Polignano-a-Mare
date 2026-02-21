import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

/**
 * GET - Fetch all unavailable dates for a given room
 * Combines: confirmed bookings + blocked_dates
 * Uses client-side Firebase SDK (works without Firebase Admin PEM key)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    const unavailableDates: Set<string> = new Set()

    // 1. Get all active bookings (confirmed, paid, pending)
    const bookingsRef = collection(db, "bookings")
    const bookingsQuery = query(
      bookingsRef,
      where("status", "in", ["confirmed", "paid", "pending"]),
    )
    const bookingsSnap = await getDocs(bookingsQuery)

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

    // 2. Get blocked_dates from Firebase
    try {
      const blockedRef = collection(db, "blocked_dates")
      const blockedSnap = await getDocs(blockedRef)

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
      console.warn("[unavailable-dates] blocked_dates collection error:", blockedError)
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
