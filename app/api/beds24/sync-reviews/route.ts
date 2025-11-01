import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { getFirestore } from "firebase-admin/firestore"
import { admin } from "@/lib/firebase-admin"

/**
 * Sync reviews from Beds24 (Booking.com and Airbnb) to Firebase
 * Requires BEDS24_PROPERTY_ID environment variable
 */
export async function POST() {
  try {
    const reviews = await beds24Client.getReviews()

    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Nessuna recensione trovata. Verifica che BEDS24_PROPERTY_ID sia configurato correttamente nelle variabili d'ambiente.",
        synced: 0,
        skipped: 0,
        total: 0,
      })
    }

    const db = getFirestore(admin)
    const reviewsRef = db.collection("reviews")

    let synced = 0
    let skipped = 0

    for (const review of reviews) {
      try {
        // Check if review already exists by beds24Id
        const existingQuery = await reviewsRef.where("beds24Id", "==", review.id).limit(1).get()

        if (!existingQuery.empty) {
          skipped++
          continue
        }

        // Add review to Firebase
        await reviewsRef.add({
          beds24Id: review.id,
          bookingId: review.bookingId,
          roomId: review.roomId,
          name: review.guestName,
          rating: review.rating,
          comment: review.comment,
          source: review.source,
          date: review.date,
          response: review.response || null,
          verified: true,
          synced: true,
          syncedAt: new Date().toISOString(),
          createdAt: review.date,
        })

        synced++
      } catch (error) {
        console.error(`Error syncing review ${review.id}:`, error)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message:
        synced > 0
          ? `Sincronizzate ${synced} recensioni da Beds24 (Booking.com e Airbnb)`
          : "Nessuna nuova recensione da sincronizzare",
      synced,
      skipped,
      total: reviews.length,
    })
  } catch (error) {
    console.error("Error syncing reviews:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isMissingPropertyId = errorMessage.includes("BEDS24_PROPERTY_ID")

    return NextResponse.json(
      {
        success: false,
        error: isMissingPropertyId
          ? "Configurazione mancante: aggiungi BEDS24_PROPERTY_ID nelle variabili d'ambiente"
          : "Errore durante la sincronizzazione delle recensioni",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}

/**
 * Get reviews from Beds24 (without syncing)
 */
export async function GET() {
  try {
    const reviews = await beds24Client.getReviews()

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
