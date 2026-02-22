import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Cron job: Auto-sync reviews from Smoobu completed bookings.
 * Triggered externally from cron-jobs.org every 6 ore.
 * Requires Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.split(" ")[1]
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
