import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { bookingId, checkIn, checkOut } = await request.json()

    if (!bookingId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Calculate nights
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    if (nights < 1) {
      return NextResponse.json({ error: "Le date non sono valide" }, { status: 400 })
    }

    // Get room price (you should fetch this from your rooms collection)
    // For now, calculate based on original booking
    const pricePerNight = Math.round(booking.totalAmount / booking.nights)
    const newPrice = pricePerNight * nights

    return NextResponse.json({
      newPrice,
      nights,
      pricePerNight,
    })
  } catch (error) {
    console.error("Error calculating price:", error)
    return NextResponse.json({ error: "Errore nel calcolo del prezzo" }, { status: 500 })
  }
}
