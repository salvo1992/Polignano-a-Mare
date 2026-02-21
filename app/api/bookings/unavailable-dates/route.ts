import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { resolveToLocalRoomId } from "@/lib/room-mapping"

/**
 * GET - Fetch all unavailable dates for a given room
 * Combines: confirmed bookings + blocked_dates
 * Uses client-side Firebase SDK (works without Firebase Admin PEM key)
 * Handles room ID mismatches between Smoobu and local IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    const unavailableDates: Set<string> = new Set()

    // Helper: check if a booking's roomId matches the requested room
    // Handles both local IDs ("1", "2") and Smoobu apartment IDs
    function roomMatches(bookingRoomId: string | undefined): boolean {
      if (!roomId) return true // no filter
      if (!bookingRoomId) return true // no roomId on booking = include it for safety
      
      // Direct match
      if (bookingRoomId === roomId) return true
      
      // Resolve both to local IDs and compare
      const resolvedBooking = resolveToLocalRoomId(bookingRoomId)
      const resolvedRequest = resolveToLocalRoomId(roomId)
      
      return resolvedBooking === resolvedRequest
    }

    // 1. Get all active bookings (confirmed, paid, pending)
    const bookingsRef = collection(db, "bookings")
    const bookingsQuery = query(
      bookingsRef,
      where("status", "in", ["confirmed", "paid", "pending"]),
    )
    const bookingsSnap = await getDocs(bookingsQuery)

    bookingsSnap.forEach((docSnap) => {
      const booking = docSnap.data()

      if (!roomMatches(booking.roomId)) return

      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return

      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        unavailableDates.add(d.toISOString().split("T")[0])
      }
    })

    // 2. Get blocked_dates from Firebase
    try {
      const blockedRef = collection(db, "blocked_dates")
      const blockedSnap = await getDocs(blockedRef)

      blockedSnap.forEach((docSnap) => {
        const blocked = docSnap.data()

        if (!roomMatches(blocked.roomId)) return

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
