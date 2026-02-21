import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { getFirestore } from "@/lib/firebase-admin"

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

    // Try to find the Smoobu apartment ID
    let apartmentId: number | null = null

    try {
      // First, try to use roomId directly as a Smoobu apartment ID (numeric)
      const numericId = parseInt(roomId)
      if (!isNaN(numericId) && numericId > 1000) {
        apartmentId = numericId
      } else {
        // Try to find by name
        const apartment = await smoobuClient.findApartmentByName(roomId)
        if (apartment) {
          apartmentId = apartment.id
          console.log("[Smoobu] Found apartment by name:", apartment.name, "ID:", apartment.id)
        } else {
          // Get all apartments and use the first one if there's only one
          const apartments = await smoobuClient.getApartmentsCached()
          if (apartments.length === 1) {
            apartmentId = apartments[0].id
            console.log("[Smoobu] Using only apartment:", apartments[0].name, "ID:", apartments[0].id)
          } else if (apartments.length > 0) {
            // Try partial match with room name
            const match = apartments.find(a => 
              a.name.toLowerCase().includes(roomId.toLowerCase()) ||
              roomId.toLowerCase().includes(a.name.toLowerCase())
            )
            if (match) {
              apartmentId = match.id
              console.log("[Smoobu] Partial match apartment:", match.name, "ID:", match.id)
            } else {
              apartmentId = apartments[0].id
              console.log("[Smoobu] No match, using first apartment:", apartments[0].name, "ID:", apartments[0].id)
            }
          }
        }
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
    const db = getFirestore()
    try {
      await db.doc(`bookings/${bookingId}`).update({
        smoobuReservationId: smoobuResult.id,
        smoobuSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log("[Smoobu] Firebase booking updated with smoobuReservationId:", smoobuResult.id)
    } catch (dbError) {
      console.error("[Smoobu] Error updating Firebase booking:", dbError)
      // The Smoobu reservation was still created successfully
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
