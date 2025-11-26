import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Unblock dates on Beds24 based on room and date range
 * Used when cancelling bookings to free up the dates
 */
export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log(`[v0] Unblocking dates for room ${roomId}: ${checkIn} to ${checkOut}`)

    // Find blocked dates in Firestore that match
    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(
      blockedDatesRef,
      where("roomId", "==", roomId),
      where("from", "==", checkIn),
      where("to", "==", checkOut)
    )
    
    const snapshot = await getDocs(q)
    
    let beds24Success = false
    
    for (const doc of snapshot.docs) {
      const blockData = doc.data()
      
      // Try to unblock on Beds24 if it was synced
      if (blockData.syncedToBeds24 && blockData.beds24BookingId) {
        try {
          await beds24Client.unblockDates(blockData.beds24BookingId)
          beds24Success = true
          console.log(`[v0] Successfully unblocked on Beds24`)
        } catch (error) {
          console.error("[v0] Failed to unblock on Beds24:", error)
        }
      }
      
      // Remove from Firestore
      await deleteDoc(doc.ref)
    }

    return NextResponse.json({
      success: true,
      beds24Success,
      message: beds24Success 
        ? "Date sbloccate su tutte le piattaforme"
        : "Date sbloccate dal sito. Verifica manualmente su Beds24"
    })
  } catch (error) {
    console.error("[v0] Error unblocking booking dates:", error)
    return NextResponse.json(
      { error: "Failed to unblock dates" },
      { status: 500 }
    )
  }
}
