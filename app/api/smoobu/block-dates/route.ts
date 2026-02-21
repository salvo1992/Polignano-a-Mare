import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { getSmoobuName, setSmoobuApartmentIds } from "@/lib/room-mapping"

export const dynamic = "force-dynamic"

/**
 * Block dates on Smoobu (syncs to Airbnb and Booking.com)
 * Used for maintenance or manual blocking
 * Always tries Smoobu first, then saves to Firestore for local tracking
 * Falls back to Firestore-only storage if Smoobu API fails
 */
export async function POST(request: Request) {
  try {
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, from, to" },
        { status: 400 }
      )
    }

    // Validate dates
    if (new Date(from) >= new Date(to)) {
      return NextResponse.json(
        { error: "La data di inizio deve essere prima della data di fine" },
        { status: 400 }
      )
    }

    console.log(`[Smoobu] Blocking dates for room ${roomId}: ${from} to ${to}, reason: ${reason}`)

    // Check if dates are already blocked for this room
    const blockedDatesRef = collection(db, "blocked_dates")
    const existingQuery = query(
      blockedDatesRef,
      where("roomId", "==", roomId.toString()),
      where("from", "==", from),
      where("to", "==", to)
    )
    const existingDocs = await getDocs(existingQuery)

    if (!existingDocs.empty) {
      return NextResponse.json(
        { error: "Queste date sono gia' bloccate per questa camera" },
        { status: 409 }
      )
    }

    let smoobuSuccess = false
    let smoobuError = null
    let smoobuReservationId = null

    // Step 1: Block on Smoobu first (this propagates to Booking.com, Airbnb, Expedia)
    // Resolve local room ID to Smoobu apartment ID
    try {
      const apartments = await smoobuClient.getApartmentsCached()
      setSmoobuApartmentIds(apartments)

      // Find Smoobu apartment by name mapping (e.g. "1" -> "Acies", "2" -> "Aquarum")
      const smoobuName = getSmoobuName(roomId.toString())
      let smoobuAptId = roomId.toString()
      if (smoobuName) {
        const apt = apartments.find(
          (a) => a.name.toLowerCase().includes(smoobuName.toLowerCase()),
        )
        if (apt) {
          smoobuAptId = apt.id.toString()
          console.log(`[Smoobu] Resolved room ${roomId} -> ${smoobuName} -> apartment ${smoobuAptId}`)
        }
      }

      const result = await smoobuClient.blockDates(
        smoobuAptId,
        from,
        to,
        reason || "maintenance"
      )
      smoobuSuccess = true
      smoobuReservationId = result.id
      console.log(
        `[Smoobu] Successfully blocked dates with reservation ID: ${result.id}`
      )
    } catch (error) {
      smoobuError = error instanceof Error ? error.message : String(error)
      console.error(
        "[Smoobu] Failed to block dates on Smoobu (saving to Firestore only):",
        error
      )
    }

    // Step 2: Save to Firestore for local tracking
    await addDoc(blockedDatesRef, {
      roomId: roomId.toString(),
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToSmoobu: smoobuSuccess,
      smoobuReservationId: smoobuReservationId,
      smoobuError: smoobuError,
    })

    const message = smoobuSuccess
      ? "Date bloccate con successo su tutte le piattaforme (Smoobu, Booking.com, Airbnb, Expedia)"
      : `Date bloccate sul sito. ATTENZIONE: Blocco su Smoobu fallito (${smoobuError || "errore sconosciuto"}) - blocca manualmente su Airbnb/Booking.com`

    return NextResponse.json({
      success: true,
      smoobuSuccess,
      smoobuReservationId,
      message,
    })
  } catch (error) {
    console.error("[Smoobu] Error blocking dates:", error)
    return NextResponse.json(
      {
        error: "Failed to block dates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
