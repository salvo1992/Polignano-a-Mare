import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

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

    console.log(`[v0] Blocking dates for room ${roomId}: ${from} to ${to}`)

    let beds24Success = false
    try {
      await beds24Client.blockDates(roomId, from, to, reason || "maintenance")
      beds24Success = true
      console.log(`[v0] Dates blocked successfully on Beds24`)
    } catch (beds24Error) {
      console.error("[v0] Failed to block dates on Beds24 (will save to Firestore only):", beds24Error)
    }

    const blockedDatesRef = collection(db, "blocked_dates")
    await addDoc(blockedDatesRef, {
      roomId,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToBeds24: beds24Success,
    })

    const message = beds24Success
      ? "Dates blocked successfully on all platforms (Beds24, Airbnb, Booking.com)"
      : "Dates blocked on site only. Please block manually on Beds24 dashboard to sync with Airbnb/Booking.com"

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

