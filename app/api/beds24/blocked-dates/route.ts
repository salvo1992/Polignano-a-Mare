import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Get all blocked dates from Firestore
 */
export async function GET(request: Request) {
  try {
    console.log("[v0] Fetching blocked dates from Firestore...")
    
    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(
      blockedDatesRef,
      where("to", ">=", new Date().toISOString().split('T')[0])
    )
    
    const snapshot = await getDocs(q)
    const blockedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    blockedDates.sort((a, b) => (a.from || '').localeCompare(b.from || ''))

    console.log(`[v0] Found ${blockedDates.length} blocked date ranges`)
    
    return NextResponse.json({
      success: true,
      blockedDates
    })
  } catch (error) {
    console.error("[v0] Error fetching blocked dates:", error)
    return NextResponse.json(
      { error: "Failed to fetch blocked dates" },
      { status: 500 }
    )
  }
}
