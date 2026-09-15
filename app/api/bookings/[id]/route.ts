import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    const snapshot = await getAdminDb().collection("bookings").doc(bookingId).get()
    const booking = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error: any) {
    console.error("[API] Error fetching booking:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch booking" }, { status: 500 })
  }
}
