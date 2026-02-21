import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

export const dynamic = "force-dynamic"

/**
 * Get all blocked dates from Firestore
 * Returns active blocks sorted by date
 */
export async function GET() {
  try {
    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(blockedDatesRef, orderBy("from", "asc"))
    const snapshot = await getDocs(q)

    const now = new Date().toISOString().split("T")[0]

    const blockedDates = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((block: any) => {
        // Keep future blocks and current blocks
        // Also keep blocks where "to" date is today or later
        return block.to >= now || block.reason === "past-dates"
      })

    return NextResponse.json({
      success: true,
      blockedDates,
      count: blockedDates.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching blocked dates:", error)
    return NextResponse.json(
      { error: "Failed to fetch blocked dates" },
      { status: 500 }
    )
  }
}
