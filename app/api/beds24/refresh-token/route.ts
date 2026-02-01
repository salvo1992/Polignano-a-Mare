import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"

/**
 * Manual token refresh endpoint
 * Useful for testing or forcing a write token refresh
 */
export async function POST() {
  try {
    await beds24Client.forceRefreshWriteToken()

    return NextResponse.json({
      success: true,
      message: "Write token refreshed successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error refreshing write token:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refresh write token",
      },
      { status: 500 },
    )
  }
}
