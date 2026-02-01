import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, getDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Unblock dates on Smoobu and remove from Firestore
 */
export async function POST(request: Request) {
  try {
    const { blockId } = await request.json()

    if (!blockId) {
      return NextResponse.json(
        { error: "Missing blockId" },
        { status: 400 }
      )
    }

    console.log(`[Smoobu] Unblocking dates with ID: ${blockId}`)

    // Get the blocked date document from Firestore
    const blockRef = doc(db, "blocked_dates", blockId)
    const blockDoc = await getDoc(blockRef)

    if (!blockDoc.exists()) {
      return NextResponse.json(
        { error: "Blocked date not found" },
        { status: 404 }
      )
    }

    const blockData = blockDoc.data()
    
    // Try to unblock on Smoobu if it was synced
    let smoobuSuccess = false
    if (blockData.syncedToSmoobu && blockData.smoobuBookingId) {
      try {
        await smoobuClient.unblockDates(blockData.smoobuBookingId)
        smoobuSuccess = true
        console.log(`[Smoobu] Successfully unblocked`)
      } catch (error) {
        console.error("[Smoobu] Failed to unblock:", error)
      }
    }

    // Remove from Firestore
    await deleteDoc(blockRef)
    console.log(`[Smoobu] Removed from Firestore`)

    const message = smoobuSuccess 
      ? "Date sbloccate con successo su tutte le piattaforme"
      : "Date sbloccate dal sito. Verifica manualmente su Smoobu/Airbnb/Booking.com"

    return NextResponse.json({
      success: true,
      smoobuSuccess,
      message
    })
  } catch (error) {
    console.error("[Smoobu] Error unblocking dates:", error)
    return NextResponse.json(
      { error: "Failed to unblock dates" },
      { status: 500 }
    )
  }
}
