import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export const dynamic = 'force-dynamic'

// Firebase roomId -> Smoobu apartment name mapping
const FIREBASE_ROOM_TO_APT_NAME: Record<string, string> = {
  "1": "acies",     // Camera Familiare -> Acies on Smoobu
  "2": "aquarum",   // Camera Matrimoniale -> Aquarum on Smoobu
}

/**
 * Resolve Firebase roomId ("1" or "2") to Smoobu apartment ID
 * by querying the Smoobu apartments API and matching by name
 */
async function resolveSmoobuApartmentId(roomId: string): Promise<string | null> {
  try {
    const apartments = await smoobuClient.getApartmentsCached()
    const aptName = FIREBASE_ROOM_TO_APT_NAME[roomId]

    if (!aptName) {
      // Maybe roomId IS already a Smoobu apartment ID
      const directMatch = apartments.find(a => String(a.id) === roomId)
      if (directMatch) return String(directMatch.id)
      return null
    }

    const apartment = apartments.find(a => a.name.toLowerCase() === aptName)
    if (apartment) {
      console.log(`[Smoobu] Resolved roomId "${roomId}" -> Smoobu apartment ${apartment.id} (${apartment.name})`)
      return String(apartment.id)
    }

    console.log(`[Smoobu] No apartment found for "${aptName}". Available:`, apartments.map(a => `${a.id}:${a.name}`))
    return null
  } catch (error) {
    console.error("[Smoobu] Error resolving apartment ID:", error)
    return null
  }
}

/**
 * Block dates on Smoobu (syncs to Airbnb, Booking.com, Expedia)
 * Used for maintenance or manual blocking
 * Falls back to Firestore-only storage if Smoobu API fails
 */
export async function POST(request: Request) {
  try {
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json({ error: "Missing required fields: roomId, from, to" }, { status: 400 })
    }

    console.log(`[Smoobu] Blocking dates for room ${roomId}: ${from} to ${to}, reason: ${reason}`)

    // Resolve Firebase roomId to Smoobu apartment ID
    const smoobuApartmentId = await resolveSmoobuApartmentId(roomId)
    
    let smoobuSuccess = false
    let smoobuError = null
    let smoobuReservationId = null

    if (!smoobuApartmentId) {
      smoobuError = `Could not resolve Smoobu apartment ID for roomId "${roomId}"`
      console.error("[Smoobu]", smoobuError)
    } else {
      try {
        const result = await smoobuClient.blockDates(smoobuApartmentId, from, to, reason || "maintenance")
        smoobuSuccess = true
        smoobuReservationId = result.id
        console.log(`[Smoobu] Successfully blocked dates on apartment ${smoobuApartmentId} with reservation ID: ${result.id}`)
      } catch (error) {
        smoobuError = error instanceof Error ? error.message : String(error)
        console.error("[Smoobu] Failed to block dates on Smoobu:", error)
      }
    }

    // Save to Firestore
    const blockedDatesRef = collection(db, "blocked_dates")
    await addDoc(blockedDatesRef, {
      roomId,
      smoobuApartmentId: smoobuApartmentId || null,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToSmoobu: smoobuSuccess,
      smoobuReservationId: smoobuReservationId,
      smoobuError: smoobuError ? String(smoobuError) : null,
    })

    const message = smoobuSuccess
      ? "Date bloccate su tutte le piattaforme (Smoobu, Airbnb, Booking.com, Expedia)"
      : `Date bloccate solo sul sito. ATTENZIONE: ${smoobuError || "Errore sconosciuto"}`

    return NextResponse.json({
      success: true,
      smoobuSuccess,
      message,
    })
  } catch (error) {
    console.error("[Smoobu] Error blocking dates:", error)
    return NextResponse.json(
      { error: "Failed to block dates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
