import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { bookingId, checkIn, checkOut, newPrice } = await request.json()

    if (!bookingId || !checkIn || !checkOut || !newPrice) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    await updateDoc(bookingRef, {
      checkIn,
      checkOut,
      nights,
      totalAmount: newPrice,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error changing dates:", error)
    return NextResponse.json({ error: "Errore nella modifica delle date" }, { status: 500 })
  }
}
