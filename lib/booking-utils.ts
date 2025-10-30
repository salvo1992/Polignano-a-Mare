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
  origin: "site" | "booking" | "airbnb"
  status: "pending" | "confirmed" | "cancelled"
  createdAt: Timestamp
  beds24Id?: string
  syncedAt?: string
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
  origin: "site" | "booking" | "airbnb",
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

export async function checkRoomAvailability(roomId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const result = await checkBookingConflicts(roomId, checkIn, checkOut, "site")
  return !result.hasConflict
}

export function getBookingPriority(origin: "site" | "booking" | "airbnb"): number {
  switch (origin) {
    case "booking":
      return 1 // Highest priority
    case "airbnb":
      return 2 // Medium priority
    case "site":
      return 3 // Lowest priority
    default:
      return 999
  }
}
