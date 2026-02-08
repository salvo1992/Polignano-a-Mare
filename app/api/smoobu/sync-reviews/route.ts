import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, limit as firestoreLimit } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Sync completed channel bookings from Smoobu as review entries in Firebase.
 * Smoobu does NOT have a reviews API - reviews live on Airbnb/Booking.com/Expedia.
 * This creates entries from completed bookings so the admin can track reviews.
 */
export async function POST() {
  try {
    const reviews = await smoobuClient.getReviews()

    console.log(`[Smoobu] Retrieved ${reviews.length} completed channel bookings for review tracking`)

    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nessuna prenotazione completata trovata da Airbnb, Booking.com o Expedia.",
        synced: 0,
        skipped: 0,
        total: 0,
      })
    }

    const reviewsRef = collection(db, "reviews")

    let synced = 0
    let skipped = 0

    for (const review of reviews) {
      try {
        const uniqueId = review.id || `smoobu_${review.bookingId}`

        // Check if already exists by smoobuId
        const existingQuery = query(reviewsRef, where("smoobuId", "==", uniqueId), firestoreLimit(1))
        const existingSnap = await getDocs(existingQuery)

        if (!existingSnap.empty) {
          skipped++
          continue
        }

        // Also check by old beds24Id for backward compat
        const existingBeds24Query = query(reviewsRef, where("beds24Id", "==", uniqueId), firestoreLimit(1))
        const existingBeds24Snap = await getDocs(existingBeds24Query)
        if (!existingBeds24Snap.empty) {
          skipped++
          continue
        }

        // Skip if guest name is BLOCKED
        if (!review.guestName || review.guestName.includes("BLOCKED")) {
          skipped++
          continue
        }

        // Add review entry to Firebase
        await addDoc(reviewsRef, {
          smoobuId: uniqueId,
          bookingId: review.bookingId,
          roomId: review.roomId,
          name: review.guestName,
          rating: review.rating || 0,
          comment: review.comment || "",
          source: review.source,
          date: review.date,
          response: null,
          verified: true,
          synced: true,
          syncedAt: new Date().toISOString(),
          createdAt: review.date,
        })

        synced++
      } catch (error) {
        console.error(`[Smoobu] Error syncing review ${review.id}:`, error)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message:
        synced > 0
          ? `Importate ${synced} voci da prenotazioni completate (Airbnb, Booking.com, Expedia)`
          : "Tutte le prenotazioni completate sono gia' state importate.",
      synced,
      skipped,
      total: reviews.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error syncing reviews:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Errore durante la sincronizzazione",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Get completed channel bookings from Smoobu for review tracking
 */
export async function GET() {
  try {
    const reviews = await smoobuClient.getReviews()

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
