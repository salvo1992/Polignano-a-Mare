import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { doc, collection, setDoc, updateDoc } from "firebase/firestore"
import { setSmoobuApartmentIds, getSmoobuName, ROOM_MAPPINGS } from "@/lib/room-mapping"

/**
 * POST - Create a real reservation on Smoobu after payment
 * This ensures the booking appears on Booking.com, Airbnb, etc.
 * and prevents double bookings across all channels.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      bookingId,
      roomId,
      checkIn,
      checkOut,
      firstName,
      lastName,
      email,
      phone,
      guests,
      totalAmount,
    } = body

    if (!bookingId || !roomId || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Campi obbligatori mancanti (bookingId, roomId, checkIn, checkOut)" },
        { status: 400 }
      )
    }

    console.log("[Smoobu] Creating reservation for booking:", bookingId)
    console.log("[Smoobu] Room:", roomId, "Dates:", checkIn, "->", checkOut)

    // Find the Smoobu apartment ID using centralized room mapping
    let apartmentId: number | null = null

    try {
      const apartments = await smoobuClient.getApartmentsCached()
      setSmoobuApartmentIds(apartments)

      // Get the Smoobu name for this local room ID (e.g. "1" -> "Acies", "2" -> "Aquarum")
      const smoobuName = getSmoobuName(roomId)

      if (smoobuName) {
        const match = apartments.find(
          (a) => a.name.toLowerCase().includes(smoobuName.toLowerCase()),
        )
        if (match) {
          apartmentId = match.id
          console.log("[Smoobu] Matched room", roomId, "->", smoobuName, "-> apartment ID:", match.id)
        }
      }

      // Fallback: try numeric ID directly
      if (!apartmentId) {
        const numericId = parseInt(roomId)
        if (!isNaN(numericId) && numericId > 1000) {
          apartmentId = numericId
        }
      }

      // Fallback: use first apartment if only one exists
      if (!apartmentId && apartments.length === 1) {
        apartmentId = apartments[0].id
        console.log("[Smoobu] Fallback to only apartment:", apartments[0].name)
      }
    } catch (error) {
      console.error("[Smoobu] Error finding apartment:", error)
    }

    if (!apartmentId) {
      console.warn("[Smoobu] Could not determine apartment ID for room:", roomId)
      return NextResponse.json({
        success: false,
        error: "Impossibile determinare l'appartamento Smoobu per questa stanza",
        message: "La prenotazione e' stata salvata ma non sincronizzata con Smoobu",
      }, { status: 400 })
    }

    // Create the reservation on Smoobu
    const smoobuResult = await smoobuClient.createReservation({
      apartmentId,
      arrival: checkIn,
      departure: checkOut,
      firstName: firstName || "Guest",
      lastName: lastName || "",
      email: email || "",
      phone: phone || "",
      adults: guests || 1,
      children: 0,
      price: totalAmount || 0,
      notice: `Prenotazione diretta dal sito - Booking ID: ${bookingId}`,
    })

    console.log("[Smoobu] Reservation created with ID:", smoobuResult.id)

    // Update the Firebase booking with the Smoobu reservation ID
    try {
      const bookingRef = doc(db, "bookings", bookingId)
      await updateDoc(bookingRef, {
        smoobuReservationId: smoobuResult.id,
        smoobuSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log("[Smoobu] Firebase booking updated with smoobuReservationId:", smoobuResult.id)
    } catch (dbError) {
      console.error("[Smoobu] Error updating Firebase booking:", dbError)
    }

    // Also create a blocked_dates entry so the calendar immediately reflects the booking
    try {
      const blockRef = doc(collection(db, "blocked_dates"))
      await setDoc(blockRef, {
        roomId: roomId,
        from: checkIn,
        to: checkOut,
        reason: `auto-booking: ${firstName || "Guest"} ${lastName || ""} (ID: ${bookingId})`,
        syncedToSmoobu: true,
        smoobuReservationId: smoobuResult.id,
        createdAt: new Date().toISOString(),
      })
      console.log("[Smoobu] blocked_dates entry created for dates:", checkIn, "->", checkOut)
    } catch (blockError) {
      console.error("[Smoobu] Error creating blocked_dates entry:", blockError)
    }

    return NextResponse.json({
      success: true,
      smoobuReservationId: smoobuResult.id,
      message: `Prenotazione creata su Smoobu (ID: ${smoobuResult.id}). I canali Booking.com e Airbnb sono stati aggiornati.`,
    })
  } catch (error) {
    console.error("[Smoobu] Error creating reservation:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Errore nella creazione della prenotazione su Smoobu",
        details: error instanceof Error ? error.message : "Unknown error",
        message: "La prenotazione e' stata salvata nel sito ma potrebbe non essere sincronizzata con i canali esterni.",
      },
      { status: 500 }
    )
  }
}
