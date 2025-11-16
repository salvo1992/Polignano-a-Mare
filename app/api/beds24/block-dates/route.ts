import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Block dates on Beds24 (syncs to Airbnb and Booking.com)
 * Used for maintenance or manual blocking
 * Falls back to Firestore-only storage if Beds24 API fails
 */
export async function POST(request: Request) {
  try {
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json({ error: "Missing required fields: roomId, from, to" }, { status: 400 })
    }

    console.log(`[v0] Blocking dates for room ${roomId}: ${from} to ${to}, reason: ${reason}`)
    console.log(`[v0] Blocking dates on Beds24:`, { roomId, from, to, reason })

    let beds24Success = false
    let beds24Error = null
    let beds24BookingId = null

    try {
      const result = await beds24Client.blockDates(roomId, from, to, reason || "maintenance")
      beds24Success = true
      beds24BookingId = result // Store the booking ID returned by Beds24
      console.log(`[v0] Successfully blocked dates on Beds24`)
    } catch (error) {
      beds24Error = error
      console.error("[v0] Failed to block dates on Beds24 (saving to Firestore only):", error)
    }

    const blockedDatesRef = collection(db, "blocked_dates")
    await addDoc(blockedDatesRef, {
      roomId,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToBeds24: beds24Success,
      beds24BookingId: beds24BookingId,
      beds24Error: beds24Error ? String(beds24Error) : null,
    })

    const message = beds24Success
      ? "Date bloccate con successo su tutte le piattaforme (Beds24, Airbnb, Booking.com)"
      : "Date bloccate sul sito. ATTENZIONE: Blocco su Beds24 fallito - blocca manualmente su Airbnb/Booking.com"

    return NextResponse.json({
      success: true,
      beds24Success,
      message,
    })
  } catch (error) {
    console.error("[v0] Error blocking dates:", error)
    return NextResponse.json(
      { error: "Failed to block dates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}


