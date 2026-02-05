import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { getFirestore } from "@/lib/firebase-admin"

/**
 * Sync reviews from Smoobu (Booking.com and Airbnb) to Firebase
 * Smoobu aggregates reviews from connected channels
 */
export async function POST() {
  try {
    const reviews = await smoobuClient.getReviews()

    console.log(`[Smoobu] Retrieved ${reviews.length} total reviews`)

    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nessuna recensione trovata. Le recensioni vengono recuperate dai messaggi degli ospiti delle prenotazioni completate su Booking.com e Airbnb.",
        synced: 0,
        skipped: 0,
        total: 0,
      })
    }

    const db = getFirestore()
    const reviewsRef = db.collection("reviews")

    let synced = 0
    let skipped = 0

    for (const review of reviews) {
      try {
        const uniqueId = review.id || `smoobu_${review.bookingId}_${review.guestName}_${review.date}`

        // Check if review already exists
        const existingQuery = await reviewsRef.where("smoobuId", "==", uniqueId).limit(1).get()

        if (!existingQuery.empty) {
          console.log(`[Smoobu] Review ${uniqueId} already exists, skipping`)
          skipped++
          continue
        }

        // Also check by old beds24Id in case of migrated reviews
        const existingBeds24Query = await reviewsRef.where("beds24Id", "==", uniqueId).limit(1).get()
        if (!existingBeds24Query.empty) {
          skipped++
          continue
        }

        if (!review.comment && !review.rating) {
          skipped++
          continue
        }

        // Add review to Firebase
        await reviewsRef.add({
          smoobuId: uniqueId,
          bookingId: review.bookingId,
          roomId: review.roomId,
          name: review.guestName,
          rating: review.rating,
          comment: review.comment || "",
          source: review.source,
          date: review.date,
          response: review.response || null,
          verified: true,
          synced: true,
          syncedAt: new Date().toISOString(),
          createdAt: review.date,
        })

        console.log(`[Smoobu] Successfully synced review ${uniqueId}`)
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
          ? `Sincronizzate ${synced} recensioni da Smoobu (Booking.com e Airbnb)`
          : "Nessuna nuova recensione da sincronizzare",
      synced,
      skipped,
      total: reviews.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error syncing reviews:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Errore durante la sincronizzazione delle recensioni",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Get reviews from Smoobu (without syncing)
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
