import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { bookingId, guestName } = await request.json()

    if (!bookingId || !guestName) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    const currentGuests = booking.guests || 1
    const maxGuests = booking.maxGuests || 2

    if (currentGuests >= maxGuests) {
      return NextResponse.json({ error: "Numero massimo di ospiti raggiunto" }, { status: 400 })
    }

    await updateDoc(bookingRef, {
      guests: currentGuests + 1,
      additionalGuests: arrayUnion(guestName),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding guest:", error)
    return NextResponse.json({ error: "Errore nell'aggiunta dell'ospite" }, { status: 500 })
  }
}
