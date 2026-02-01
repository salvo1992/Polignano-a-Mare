import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Block dates on Smoobu (syncs to Airbnb and Booking.com)
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

    let smoobuSuccess = false
    let smoobuError = null
    let smoobuBookingId = null

    try {
      await smoobuClient.blockDates(roomId, from, to, reason || "maintenance")
      smoobuSuccess = true
      console.log(`[Smoobu] Successfully blocked dates`)
    } catch (error) {
      smoobuError = error
      console.error("[Smoobu] Failed to block dates (saving to Firestore only):", error)
    }

    const blockedDatesRef = collection(db, "blocked_dates")
    await addDoc(blockedDatesRef, {
      roomId,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToSmoobu: smoobuSuccess,
      smoobuBookingId: smoobuBookingId,
      smoobuError: smoobuError ? String(smoobuError) : null,
    })

    const message = smoobuSuccess
      ? "Date bloccate con successo su tutte le piattaforme (Smoobu, Airbnb, Booking.com)"
      : "Date bloccate sul sito. ATTENZIONE: Blocco su Smoobu fallito - blocca manualmente su Airbnb/Booking.com"

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
