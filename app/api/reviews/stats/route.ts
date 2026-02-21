import { NextResponse } from "next/server"
import { isFirebaseInitialized, getFirestore } from "@/lib/firebase-admin"

const DEFAULT_STATS = {
  success: true,
  totalReviews: 0,
  averageRating: 0,
  satisfaction: 0,
  bySource: {},
}

/**
 * GET - Fetch review statistics from Firebase
 * Used by homepage and reviews page for dynamic stats display
 * Falls back to default values if Firebase is not initialized
 */
export async function GET() {
  // Guard: if Firebase Admin is not initialized, return safe defaults
  if (!isFirebaseInitialized()) {
    console.warn("[ReviewStats] Firebase Admin not initialized, returning defaults")
    return NextResponse.json(DEFAULT_STATS)
  }

  try {
    const db = getFirestore()
    const snapshot = await db.collection("reviews").get()

    const allReviews = snapshot.docs.map((d) => d.data())
    const completedReviews = allReviews.filter((r) => r.rating > 0 && r.comment)

    const avgRating =
      completedReviews.length > 0
        ? completedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / completedReviews.length
        : 0

    const sourceBreakdown: Record<string, number> = {}
    for (const r of completedReviews) {
      const src = r.source || "other"
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
    }

    // Calculate satisfaction: % of reviews with rating >= 4
    const satisfied = completedReviews.filter((r) => r.rating >= 4).length
    const satisfactionPct = completedReviews.length > 0 ? Math.round((satisfied / completedReviews.length) * 100) : 0

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
