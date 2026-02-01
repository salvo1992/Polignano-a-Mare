import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, getDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Unblock dates on Beds24 and remove from Firestore
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

    console.log(`[v0] Unblocking dates with ID: ${blockId}`)

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
    
    // Try to unblock on Beds24 if it was synced
    let beds24Success = false
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
    await deleteDoc(blockRef)
    console.log(`[v0] Removed from Firestore`)

    const message = beds24Success 
      ? "Date sbloccate con successo su tutte le piattaforme"
      : "Date sbloccate dal sito. Verifica manualmente su Beds24/Airbnb/Booking.com"

    return NextResponse.json({
      success: true,
      beds24Success,
      message
    })
  } catch (error) {
    console.error("[v0] Error unblocking dates:", error)
    return NextResponse.json(
      { error: "Failed to unblock dates" },
      { status: 500 }
    )
  }
}
