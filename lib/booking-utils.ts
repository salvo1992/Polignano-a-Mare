import { db } from "./firebase"
import { collection, query, where, getDocs, type Timestamp } from "firebase/firestore"

export interface Booking {
  id: string
  guestFirst: string
  guestLast: string
  email: string
  phone: string
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  total: number
  origin: "site" | "booking" | "airbnb" | "expedia" | "direct"
  status: "pending" | "confirmed" | "cancelled"
  createdAt: Timestamp
  beds24Id?: string
  smoobuId?: string
  channelId?: number
  channelName?: string
  syncedAt?: string
  services?: string[]
  priceBreakdown?: {
    subtotal: number
    serviceFee?: number
    touristTax?: number
    total: number
  }
  notes?: string
}

export interface Room {
  id: string
  name: string
  status: "available" | "booked" | "maintenance"
  price: number
  capacity: number
  description: string
  amenities: string[]
}

/**
 * Check for booking conflicts with priority system
 * Priority: Booking.com (1) > Airbnb (2) > Site (3)
 * Lower number = higher priority
 */
export async function checkBookingConflicts(
  roomId: string,
  checkIn: string,
  checkOut: string,
  origin: Booking["origin"],
): Promise<{ hasConflict: boolean; conflictingBooking?: Booking }> {
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("roomId", "==", roomId), where("status", "in", ["pending", "confirmed"]))

  const snapshot = await getDocs(q)
  const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Booking)

  const requestStart = new Date(checkIn)
  const requestEnd = new Date(checkOut)

  for (const booking of bookings) {
    const bookingStart = new Date(booking.checkIn)
    const bookingEnd = new Date(booking.checkOut)

    // Check for date overlap
    const hasOverlap =
      (requestStart >= bookingStart && requestStart < bookingEnd) ||
      (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
      (requestStart <= bookingStart && requestEnd >= bookingEnd)

    if (hasOverlap) {
      // Check priority: Booking.com > Airbnb > Site
      const existingPriority = getBookingPriority(booking.origin)
      const newPriority = getBookingPriority(origin)

      // If existing booking has higher or equal priority, there's a conflict
      if (existingPriority <= newPriority) {
        console.log(
          `[v0] Booking conflict detected: ${booking.origin} (priority ${existingPriority}) blocks ${origin} (priority ${newPriority})`,
        )
        return { hasConflict: true, conflictingBooking: booking }
      }
    }
  }

  return { hasConflict: false }
}

/**
 * Check room availability considering BOTH bookings AND blocked dates
 * This is the main function used by the booking widget
 */
export async function checkRoomAvailability(roomId: string, checkIn: string, checkOut: string): Promise<boolean> {
  // Check against existing bookings
  const bookingConflict = await checkBookingConflicts(roomId, checkIn, checkOut, "site")
  if (bookingConflict.hasConflict) return false

  // Also check against blocked_dates collection
  const blockedConflict = await checkBlockedDatesConflict(roomId, checkIn, checkOut)
  if (blockedConflict) return false

  return true
}

/**
 * Check if the requested dates overlap with any blocked date ranges
 */
async function checkBlockedDatesConflict(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  try {
    const blockedRef = collection(db, "blocked_dates")
    const snapshot = await getDocs(blockedRef)

    const requestStart = new Date(checkIn)
    const requestEnd = new Date(checkOut)
    requestStart.setHours(0, 0, 0, 0)
    requestEnd.setHours(0, 0, 0, 0)

    for (const doc of snapshot.docs) {
      const blocked = doc.data()

      // If roomId doesn't match, skip
      if (blocked.roomId && blocked.roomId !== roomId) continue

      const from = new Date(blocked.startDate || blocked.from || blocked.arrival)
      const to = new Date(blocked.endDate || blocked.to || blocked.departure)
      from.setHours(0, 0, 0, 0)
      to.setHours(0, 0, 0, 0)

      if (isNaN(from.getTime()) || isNaN(to.getTime())) continue

      // Check date overlap
      const hasOverlap =
        (requestStart >= from && requestStart < to) ||
        (requestEnd > from && requestEnd <= to) ||
        (requestStart <= from && requestEnd >= to)

      if (hasOverlap) {
        console.log(
          `[v0] Blocked date conflict: ${from.toISOString().split("T")[0]} - ${to.toISOString().split("T")[0]} overlaps with ${checkIn} - ${checkOut}`,
        )
        return true
      }
    }
    return false
  } catch (error) {
    console.error("[v0] Error checking blocked dates:", error)
    return false // Don't block booking if check fails
  }
}

export function getBookingPriority(origin: Booking["origin"]): number {
  switch (origin) {
    case "booking":
      return 1 // Highest priority
    case "airbnb":
      return 2
    case "expedia":
      return 3
    case "site":
      return 4
    case "direct":
      return 5
    default:
      return 999
  }
}

export function getRoomStatus(
  roomId: string,
  bookings: Booking[],
  maintenanceRooms: string[] = []
): "available" | "booked" | "maintenance" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if room is in maintenance
  if (maintenanceRooms.includes(roomId)) {
    return "maintenance"
  }

  // Check if room has active booking for today
  const hasActiveBooking = bookings.some((booking) => {
    if (booking.roomId !== roomId) return false
    if (booking.status !== "confirmed") return false

    const checkIn = new Date(booking.checkIn)
    const checkOut = new Date(booking.checkOut)
    checkIn.setHours(0, 0, 0, 0)
    checkOut.setHours(0, 0, 0, 0)

    return today >= checkIn && today <= checkOut
  })

  return hasActiveBooking ? "booked" : "available"
}
