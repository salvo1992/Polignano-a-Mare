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
  total: number
  origin: "site" | "booking" | "airbnb"
  status: "pending" | "confirmed" | "cancelled"
  createdAt: Timestamp
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

export async function checkRoomAvailability(roomId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("roomId", "==", roomId), where("status", "in", ["pending", "confirmed"]))

  const snapshot = await getDocs(q)
  const bookings = snapshot.docs.map((doc) => doc.data() as Booking)

  const requestStart = new Date(checkIn)
  const requestEnd = new Date(checkOut)

  for (const booking of bookings) {
    const bookingStart = new Date(booking.checkIn)
    const bookingEnd = new Date(booking.checkOut)

    if (
      (requestStart >= bookingStart && requestStart < bookingEnd) ||
      (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
      (requestStart <= bookingStart && requestEnd >= bookingEnd)
    ) {
      return false
    }
  }

  return true
}

export function getBookingPriority(origin: "site" | "booking" | "airbnb"): number {
  switch (origin) {
    case "booking":
      return 1
    case "airbnb":
      return 2
    case "site":
      return 3
    default:
      return 999
  }
}
