import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"

export const dynamic = 'force-dynamic'

// Firebase room ID -> Smoobu apartment name mapping
const ROOM_NAME_MAP: Record<string, string> = {
  "1": "Acies",
  "2": "Aquarum",
}

/**
 * Get apartments from Smoobu with Firebase room mapping info
 */
export async function GET() {
  try {
    const apartments = await smoobuClient.getApartments()

    // Build mapping from Firebase roomIds to Smoobu apartment IDs
    const roomMapping: Record<string, { smoobuId: number; smoobuName: string }> = {}
    for (const [firebaseId, roomName] of Object.entries(ROOM_NAME_MAP)) {
      const apt = apartments.find(a => a.name.toLowerCase() === roomName.toLowerCase())
      if (apt) {
        roomMapping[firebaseId] = { smoobuId: apt.id, smoobuName: apt.name }
      }
    }

    return NextResponse.json({
      success: true,
      apartments: apartments.map(a => ({ id: a.id, name: a.name })),
      roomMapping,
      count: apartments.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching apartments:", error)
    return NextResponse.json(
      { error: "Failed to fetch apartments", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
