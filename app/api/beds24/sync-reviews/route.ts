import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore"

/**
 * Sync reviews from Beds24 to Firebase
 * Fetches reviews from Airbnb and Booking.com via Beds24
 */
export async function POST() {
  try {
    console.log("[v0] Syncing reviews from Beds24...")

    // Fetch reviews from Beds24
    const beds24Reviews = await beds24Client.getReviews()

    console.log(`[v0] Found ${beds24Reviews.length} reviews from Beds24`)

    let syncedCount = 0
    let skippedCount = 0

    for (const review of beds24Reviews) {
      // Check if review already exists in Firebase
      const reviewsRef = collection(db, "reviews")
      const q = query(reviewsRef, where("beds24Id", "==", review.id))

      const existingReviews = await getDocs(q)

      if (!existingReviews.empty) {
        console.log(`[v0] Review already exists: ${review.id}`)
        skippedCount++
        continue
      }

      // Map Beds24 review to Firebase review format
      const firebaseReview = {
        name: review.guestName,
        rating: review.rating,
        comment: review.comment,
        date: review.date,
        source: review.source,
        beds24Id: review.id,
        bookingId: review.bookingId,
        verified: true, // Reviews from Beds24 are verified
        syncedAt: new Date().toISOString(),
      }

      // Save to Firebase
      const reviewRef = doc(collection(db, "reviews"))
      await setDoc(reviewRef, firebaseReview)

      console.log(`[v0] Synced review: ${review.id} from ${review.source}`)
      syncedCount++
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: beds24Reviews.length,
    })
  } catch (error) {
    console.error("[v0] Error syncing reviews:", error)
    return NextResponse.json(
      { error: "Failed to sync reviews", details: error instanceof Error ? error.message : "Unknown error" },
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
    console.error("[v0] Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
