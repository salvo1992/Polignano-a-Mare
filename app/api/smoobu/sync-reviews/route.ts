import { NextResponse } from "next/server"
import { getFirestore } from "@/lib/firebase-admin"

/**
 * POST - Add a manual review to Firebase (from admin panel)
 * Since Smoobu has no reviews API, reviews are added manually by the admin
 * (copy-pasted from Booking.com / Airbnb dashboards)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    // Action: add a single manual review
    if (action === "add-review") {
      const { name, location, rating, comment, source, date } = body

      if (!name || !comment || !rating) {
        return NextResponse.json(
          { success: false, error: "Nome, commento e rating sono obbligatori" },
          { status: 400 }
        )
      }

      const db = getFirestore()
      const reviewsRef = db.collection("reviews")

      const reviewData = {
        name: name.trim(),
        location: (location || "").trim(),
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment.trim(),
        source: source || "manual",
        date: date || new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
        verified: true,
        synced: true,
        syncedAt: new Date().toISOString(),
        createdAt: Date.now(),
        manualEntry: true,
      }

      const docRef = await reviewsRef.add(reviewData)

      console.log(`[Reviews] Manual review added: ${docRef.id} by ${name}`)

      return NextResponse.json({
        success: true,
        message: `Recensione di ${name} aggiunta con successo`,
        reviewId: docRef.id,
      })
    }

    // Action: bulk import reviews
    if (action === "bulk-import") {
      const { reviews } = body

      if (!Array.isArray(reviews) || reviews.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nessuna recensione da importare" },
          { status: 400 }
        )
      }

      const db = getFirestore()
      const reviewsRef = db.collection("reviews")
      let imported = 0
      let skipped = 0

      for (const review of reviews) {
        try {
          if (!review.name || !review.comment) {
            skipped++
            continue
          }

          // Check for duplicates by name + comment substring
          const existingQuery = await reviewsRef
            .where("name", "==", review.name.trim())
            .limit(5)
            .get()

          const isDuplicate = existingQuery.docs.some(doc => {
            const existing = doc.data()
            return existing.comment?.substring(0, 50) === review.comment.trim().substring(0, 50)
          })

          if (isDuplicate) {
            skipped++
            continue
          }

          await reviewsRef.add({
            name: review.name.trim(),
            location: (review.location || "").trim(),
            rating: Math.min(5, Math.max(1, Number(review.rating || 5))),
            comment: review.comment.trim(),
            source: review.source || "manual",
            date: review.date || new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
            verified: true,
            synced: true,
            syncedAt: new Date().toISOString(),
            createdAt: Date.now(),
            manualEntry: true,
          })

          imported++
        } catch (error) {
          console.error(`[Reviews] Error importing review from ${review.name}:`, error)
          skipped++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Importate ${imported} recensioni, ${skipped} saltate`,
        imported,
        skipped,
        total: reviews.length,
      })
    }

    return NextResponse.json(
      { success: false, error: "Azione non valida. Usa 'add-review' o 'bulk-import'" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Reviews] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Errore durante l'operazione sulle recensioni",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch all reviews from Firebase
 */
export async function GET() {
  try {
    const db = getFirestore()
    const reviewsRef = db.collection("reviews")

    const snapshot = await reviewsRef.orderBy("createdAt", "desc").limit(100).get()

    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    })
  } catch (error) {
    console.error("[Reviews] Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
