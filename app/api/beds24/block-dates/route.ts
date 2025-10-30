import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"

/**
 * Block dates on Beds24 (syncs to Airbnb and Booking.com)
 * Used for maintenance or manual blocking
 */
export async function POST(request: Request) {
  try {
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json({ error: "Missing required fields: roomId, from, to" }, { status: 400 })
    }

    console.log(`[v0] Blocking dates for room ${roomId}: ${from} to ${to}`)

    await beds24Client.blockDates(roomId, from, to, reason || "maintenance")

    return NextResponse.json({
      success: true,
      message: "Dates blocked successfully",
    })
  } catch (error) {
    console.error("[v0] Error blocking dates:", error)
    return NextResponse.json(
      { error: "Failed to block dates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
