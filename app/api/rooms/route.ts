import { NextResponse } from "next/server"
import { getRoomContents } from "@/lib/room-content-server"
import { DEFAULT_ROOM_CONTENT } from "@/lib/room-content"

export const dynamic = "force-dynamic"
export async function GET() {
  try {
    return NextResponse.json({ rooms: await getRoomContents() }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    // Keep the public site usable while a local environment or Firebase is unavailable.
    return NextResponse.json({ rooms: DEFAULT_ROOM_CONTENT, fallback: true }, { headers: { "Cache-Control": "no-store" } })
  }
}
