import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, getDoc } from "firebase/firestore"

export const dynamic = "force-dynamic"

/**
 * Unblock dates on Smoobu and remove from Firestore
 * Performs bidirectional unblock: removes from Smoobu first, then from Firestore
 */
export async function POST(request: Request) {
  try {
    const { blockId } = await request.json()

    if (!blockId) {
      return NextResponse.json({ error: "Missing blockId" }, { status: 400 })
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

    // Step 1: Try to unblock on Smoobu if it was synced
    let smoobuSuccess = false
    let smoobuError = null

    if (blockData.syncedToSmoobu && blockData.smoobuReservationId) {
      try {
        await smoobuClient.unblockDates(
          blockData.smoobuReservationId.toString()
        )
        smoobuSuccess = true
        console.log(
          `[Smoobu] Successfully unblocked reservation ${blockData.smoobuReservationId}`
        )
      } catch (error) {
        smoobuError = error instanceof Error ? error.message : String(error)
        console.error("[Smoobu] Failed to unblock on Smoobu:", error)
      }
    } else {
      // Not synced to Smoobu, so local-only unblock
      smoobuSuccess = true // no Smoobu action needed
    }

    // Step 2: Remove from Firestore
    await deleteDoc(blockRef)
    console.log(`[Smoobu] Removed block from Firestore: ${blockId}`)

    const wasSmoobuSynced = blockData.syncedToSmoobu && blockData.smoobuReservationId

    let message: string
    if (!wasSmoobuSynced) {
      message = "Date sbloccate dal sito (non era sincronizzato con Smoobu)"
    } else if (smoobuSuccess) {
      message = "Date sbloccate con successo su tutte le piattaforme (Smoobu, Booking.com, Airbnb, Expedia)"
    } else {
      message = `Date sbloccate dal sito. ATTENZIONE: Sblocco su Smoobu fallito (${smoobuError}) - sblocca manualmente su Airbnb/Booking.com`
    }

    return NextResponse.json({
      success: true,
      smoobuSuccess,
      message,
    })
  } catch (error) {
    console.error("[Smoobu] Error unblocking dates:", error)
    return NextResponse.json(
      { error: "Failed to unblock dates" },
      { status: 500 }
    )
  }
}
