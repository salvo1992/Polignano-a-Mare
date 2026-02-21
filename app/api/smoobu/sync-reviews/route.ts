/* Smoobu Reviews Sync - Client Firebase SDK (NO firebase-admin) */
import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore"
import { setSmoobuApartmentIds, resolveToLocalRoomId } from "@/lib/room-mapping"

/* POST - Sync completed bookings from Smoobu as potential reviews */
export async function POST() {
  try {
    const apartments = await smoobuClient.getApartmentsCached()
    setSmoobuApartmentIds(apartments)

    const completedBookings = await smoobuClient.getCompletedChannelBookings()

    const reviewsRef = collection(db, "reviews")
    const existingSnap = await getDocs(reviewsRef)
    const existingIds = new Set(existingSnap.docs.map((d) => d.data().bookingId))

    let synced = 0
    let skipped = 0

    for (const booking of completedBookings) {
      if (existingIds.has(booking.id)) {
        skipped++
        continue
      }

      const localRoomId = resolveToLocalRoomId(booking.roomId)

      await addDoc(reviewsRef, {
        bookingId: booking.id,
        roomId: localRoomId,
        guestName: `${booking.firstName} ${booking.lastName}`.trim() || "Ospite",
        source: booking.referer || "direct",
        checkIn: booking.arrival,
        checkOut: booking.departure,
        rating: 0,
        comment: "",
        hidden: false,
        createdAt: new Date().toISOString(),
        syncedFrom: "smoobu",
      })
      synced++
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: completedBookings.length,
    })
  } catch (error) {
    console.error("[SyncReviews] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
