import { NextResponse } from "next/server"

/**
 * Cron job: Auto-sync reviews from Smoobu completed bookings.
 * Runs every 6 hours. Calls the sync-reviews POST endpoint internally.
 */
export async function GET(req: Request) {
  try {
    // Determine the base URL for internal API call
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`

    const response = await fetch(`${baseUrl}/api/smoobu/sync-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // default = auto-sync
    })

    const data = await response.json()

    console.log("[Cron sync-reviews]", data.message || "Completed")

    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error("[Cron sync-reviews] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
