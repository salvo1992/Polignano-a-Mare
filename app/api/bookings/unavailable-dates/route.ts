import { type NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { resolveToLocalRoomId } from "@/lib/room-mapping"
import { smoobuClient } from "@/lib/smoobu-client"

export const dynamic = "force-dynamic"

function addDateRange(target: Set<string>, fromValue: unknown, toValue: unknown) {
  const from = new Date(`${String(fromValue || "").slice(0, 10)}T00:00:00.000Z`)
  const to = new Date(`${String(toValue || "").slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return
  for (let date = new Date(from); date < to; date.setUTCDate(date.getUTCDate() + 1)) {
    target.add(date.toISOString().slice(0, 10))
  }
}

function roomMatches(storedRoomId: unknown, requestedRoomId: string | null): boolean {
  if (!requestedRoomId) return true
  if (!storedRoomId) return true
  return resolveToLocalRoomId(String(storedRoomId)) === resolveToLocalRoomId(requestedRoomId)
}

function isExpiredPending(item: FirebaseFirestore.DocumentData): boolean {
  if (item.status !== "pending" || !item.holdExpiresAt) return false
  if (item.holdExpiresAt instanceof Timestamp) return item.holdExpiresAt.toMillis() <= Date.now()
  if (typeof item.holdExpiresAt.toMillis === "function") return item.holdExpiresAt.toMillis() <= Date.now()
  const parsed = new Date(item.holdExpiresAt).getTime()
  return !Number.isNaN(parsed) && parsed <= Date.now()
}

export async function GET(request: NextRequest) {
  try {
    const roomId = new URL(request.url).searchParams.get("roomId")
    if (!roomId) return NextResponse.json({ error: "roomId mancante", dates: [] }, { status: 400 })

    const unavailableDates = new Set<string>()
    const db = getAdminDb()
    const bookingsSnap = await db
      .collection("bookings")
      .where("status", "in", ["confirmed", "paid", "pending", "payment_scheduled"])
      .get()

    bookingsSnap.forEach((document) => {
      const booking = document.data()
      if (isExpiredPending(booking) || !roomMatches(booking.roomId, roomId)) return
      addDateRange(unavailableDates, booking.checkIn, booking.checkOut)
    })

    for (const collectionName of ["blocked_dates", "smoobu_bookings"]) {
      try {
        const snapshot = await db.collection(collectionName).get()
        snapshot.forEach((document) => {
          const item = document.data()
          if (item.status === "cancelled" || item.status === "canceled") return
          if (!roomMatches(item.roomId, roomId)) return
          addDateRange(
            unavailableDates,
            item.startDate || item.from || item.arrival || item.checkIn,
            item.endDate || item.to || item.departure || item.checkOut,
          )
        })
      } catch (error) {
        console.warn(`[unavailable-dates] Could not read ${collectionName}:`, error)
      }
    }

    // Smoobu is the channel manager and therefore the live source of truth.
    const apartmentId = await smoobuClient.resolveApartmentId(roomId)
    if (!apartmentId) throw new Error(`No Smoobu mapping for room ${roomId}`)

    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 550)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)
    const rates = await smoobuClient.getRates(String(apartmentId), startDate, endDate)
    if (rates.length === 0) throw new Error("Smoobu returned no availability data")
    rates.forEach((rate) => {
      if (rate.available <= 0) unavailableDates.add(rate.date)
    })

    const dates = [...unavailableDates].sort()
    return NextResponse.json(
      { dates, count: dates.length },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[unavailable-dates] Error:", error)
    return NextResponse.json(
      { error: "Disponibilita temporaneamente non verificabile", dates: [] },
      { status: 503 },
    )
  }
}
