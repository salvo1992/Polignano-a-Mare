import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Unblock dates on Smoobu based on room and date range
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

    console.log(`[Smoobu] Unblocking dates for room ${roomId}: ${checkIn} to ${checkOut}`)

    // Find blocked dates in Firestore that match
    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(
      blockedDatesRef,
      where("roomId", "==", roomId),
      where("from", "==", checkIn),
      where("to", "==", checkOut)
    )
    
    const snapshot = await getDocs(q)
    
    let smoobuSuccess = false
    
    for (const doc of snapshot.docs) {
      const blockData = doc.data()
      
      // Try to unblock on Smoobu if it was synced
      if (blockData.syncedToSmoobu && blockData.smoobuReservationId) {
        try {
          await smoobuClient.unblockDates(blockData.smoobuReservationId.toString())
          smoobuSuccess = true
          console.log(`[Smoobu] Successfully unblocked reservation`)
        } catch (error) {
          console.error("[Smoobu] Failed to unblock:", error)
        }
      }
      
      // Remove from Firestore
      await deleteDoc(doc.ref)
    }

    return NextResponse.json({
      success: true,
      smoobuSuccess,
      message: smoobuSuccess 
        ? "Date sbloccate su tutte le piattaforme"
        : "Date sbloccate dal sito. Verifica manualmente su Smoobu"
    })
  } catch (error) {
    console.error("[Smoobu] Error unblocking booking dates:", error)
    return NextResponse.json(
      { error: "Failed to unblock dates" },
      { status: 500 }
    )
  }
}
