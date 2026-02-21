import { NextResponse } from "next/server"
import { getFirestore } from "@/lib/firebase-admin"

/**
 * GET - Fetch review statistics from Firebase
 * Used by homepage and reviews page for dynamic stats display
 */
export async function GET() {
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
    return NextResponse.json(
      { success: false, totalReviews: 0, averageRating: 0, satisfaction: 0, bySource: {} },
      { status: 200 }, // Return defaults even on error
    )
  }
}
