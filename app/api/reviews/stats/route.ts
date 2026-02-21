import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

const DEFAULT_STATS = {
  success: true,
  totalReviews: 0,
  averageRating: 0,
  satisfaction: 0,
  bySource: {},
}

/**
 * GET - Fetch review statistics from Firebase
 * Uses client-side Firebase SDK (no Firebase Admin dependency)
 */
export async function GET() {
  try {
    const reviewsRef = collection(db, "reviews")
    const snapshot = await getDocs(reviewsRef)

    const allReviews = snapshot.docs.map((d) => d.data())
    const completedReviews = allReviews.filter((r) => r.rating > 0 && r.comment && !r.hidden)

    const avgRating =
      completedReviews.length > 0
        ? completedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / completedReviews.length
        : 0

    const sourceBreakdown: Record<string, number> = {}
    for (const r of completedReviews) {
      const src = r.source || "other"
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
    }

    const satisfied = completedReviews.filter((r) => r.rating >= 4).length
    const satisfactionPct =
      completedReviews.length > 0 ? Math.round((satisfied / completedReviews.length) * 100) : 0

    return NextResponse.json({
      success: true,
      totalReviews: completedReviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      satisfaction: satisfactionPct,
      bySource: sourceBreakdown,
    })
  } catch (error) {
    console.error("[ReviewStats] Error:", error)
    return NextResponse.json(DEFAULT_STATS)
  }
}
