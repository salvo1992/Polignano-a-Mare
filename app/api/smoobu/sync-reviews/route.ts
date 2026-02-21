import { NextResponse } from "next/server"
import { getFirestore } from "@/lib/firebase-admin"

/**
 * POST - Add or auto-sync reviews to Firebase
 * Supports:
 *  - action: "add-review" — single manual review
 *  - action: "bulk-import" — bulk import reviews
 *  - action: "auto-sync-from-bookings" — auto-generate review entries from completed Smoobu bookings
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    // ----- Action: add a single manual review -----
    if (action === "add-review") {
      const { name, location, rating, comment, source, date, bookingId } = body

      if (!name || !comment || !rating) {
        return NextResponse.json(
          { success: false, error: "Nome, commento e rating sono obbligatori" },
          { status: 400 },
        )
      }

      const db = getFirestore()
      const reviewsRef = db.collection("reviews")

      // Check for duplicate by name + first 50 chars of comment
      const existingQuery = await reviewsRef.where("name", "==", name.trim()).limit(10).get()
      const isDuplicate = existingQuery.docs.some((doc) => {
        const existing = doc.data()
        return existing.comment?.substring(0, 50) === comment.trim().substring(0, 50)
      })

      if (isDuplicate) {
        return NextResponse.json({
          success: true,
          message: `Recensione di ${name} gia presente (duplicato)`,
          skipped: true,
        })
      }

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
        ...(bookingId ? { bookingId } : {}),
      }

      const docRef = await reviewsRef.add(reviewData)
      console.log(`[Reviews] Manual review added: ${docRef.id} by ${name}`)

      return NextResponse.json({
        success: true,
        message: `Recensione di ${name} aggiunta con successo`,
        reviewId: docRef.id,
      })
    }

    // ----- Action: bulk import reviews -----
    if (action === "bulk-import") {
      const { reviews } = body

      if (!Array.isArray(reviews) || reviews.length === 0) {
        return NextResponse.json({ success: false, error: "Nessuna recensione da importare" }, { status: 400 })
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

          const existingQuery = await reviewsRef.where("name", "==", review.name.trim()).limit(5).get()
          const isDuplicate = existingQuery.docs.some((doc) => {
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

    // ----- Action: auto-sync guest entries from completed Smoobu bookings -----
    if (action === "auto-sync-from-bookings") {
      const { bookings } = body

      if (!Array.isArray(bookings) || bookings.length === 0) {
        return NextResponse.json({ success: false, error: "Nessuna prenotazione da elaborare" }, { status: 400 })
      }

      const db = getFirestore()
      const reviewsRef = db.collection("reviews")
      let created = 0
      let skipped = 0

      for (const booking of bookings) {
        try {
          const guestName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim()
          if (!guestName || guestName === "BLOCKED") {
            skipped++
            continue
          }

          // Check if we already have a review from this guest for this booking
          const existingQuery = await reviewsRef.where("bookingId", "==", booking.id).limit(1).get()
          if (!existingQuery.empty) {
            skipped++
            continue
          }

          // Also check by guest name to avoid duplicates
          const nameQuery = await reviewsRef.where("name", "==", guestName).limit(5).get()
          const alreadyHasReview = nameQuery.docs.some((doc) => {
            const data = doc.data()
            // Same source and similar date = likely same stay
            return data.source === booking.referer && data.bookingId === booking.id
          })

          if (alreadyHasReview) {
            skipped++
            continue
          }

          // Create a "pending review" entry - admin can fill in the actual review text later
          // For now, create with placeholder that admin will update from Booking.com/Airbnb portal
          const arrivalDate = new Date(booking.arrival)
          const dateStr = arrivalDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })
          const countryName = booking.address?.country?.name || ""

          await reviewsRef.add({
            name: guestName,
            location: countryName,
            rating: 0, // 0 means "pending" - no rating yet
            comment: "", // Empty = pending review
            source: booking.referer || "direct",
            date: dateStr,
            verified: false,
            synced: true,
            syncedAt: new Date().toISOString(),
            createdAt: Date.now(),
            bookingId: booking.id,
            smoobuId: booking.id,
            pendingReview: true,
            arrival: booking.arrival,
            departure: booking.departure,
            channelName: booking.channelName || booking.apiSource || "",
          })

          created++
        } catch (error) {
          console.error(`[Reviews] Error creating review stub:`, error)
          skipped++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Creati ${created} stub di recensione, ${skipped} saltati`,
        created,
        skipped,
        total: bookings.length,
      })
    }

    return NextResponse.json(
      { success: false, error: "Azione non valida. Usa 'add-review', 'bulk-import' o 'auto-sync-from-bookings'" },
      { status: 400 },
    )
  } catch (error) {
    console.error("[Reviews] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Errore durante l'operazione sulle recensioni",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET - Fetch all reviews from Firebase
 * Supports query params:
 *  - pending=true — fetch only pending reviews
 *  - limit=N — limit results (default 100)
 *  - source=booking|airbnb|expedia|direct — filter by source
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const pending = searchParams.get("pending") === "true"
    const limitParam = parseInt(searchParams.get("limit") || "100")
    const source = searchParams.get("source")

    const db = getFirestore()
    let q = db.collection("reviews").orderBy("createdAt", "desc").limit(limitParam)

    if (pending) {
      q = db.collection("reviews").where("pendingReview", "==", true).orderBy("createdAt", "desc").limit(limitParam)
    }

    if (source) {
      q = db.collection("reviews").where("source", "==", source).orderBy("createdAt", "desc").limit(limitParam)
    }

    const snapshot = await q.get()

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Compute stats
    const allSnap = await db.collection("reviews").get()
    const allReviews = allSnap.docs.map((d) => d.data())
    const completedReviews = allReviews.filter((r) => r.rating > 0 && r.comment)
    const pendingReviews = allReviews.filter((r) => r.pendingReview === true && (!r.comment || r.rating === 0))
    const avgRating =
      completedReviews.length > 0
        ? (completedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / completedReviews.length).toFixed(1)
        : "0"

    const sourceBreakdown: Record<string, number> = {}
    for (const r of completedReviews) {
      const src = r.source || "other"
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
      stats: {
        total: allReviews.length,
        completed: completedReviews.length,
        pending: pendingReviews.length,
        averageRating: parseFloat(avgRating),
        bySource: sourceBreakdown,
      },
    })
  } catch (error) {
    console.error("[Reviews] Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
