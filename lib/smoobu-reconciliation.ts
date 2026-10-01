import "server-only"
import { getAdminDb } from "@/lib/firebase-admin"
import { smoobuClient, type SmoobuBooking } from "@/lib/smoobu-client"
import { convertSmoobuApartmentIdToLocal, ROOM_MAPPINGS, getRoomName } from "@/lib/room-mapping"
import { isBookingBlock } from "@/lib/room-status"
import { stayDates } from "@/lib/stay-quote"

export function matchesSmoobuId(item: Record<string, any>, id: string) {
  return [item.smoobuId, item.smoobuReservationId].some(value => value != null && String(value) === id)
}

export function linkedAutoBlock(item: Record<string, any>, id: string, bookingIds: string[]) {
  return isBookingBlock(item) && (matchesSmoobuId(item, id) || bookingIds.includes(String(item.bookingId)))
}

// Only explicit, authenticated Smoobu records can cancel local data. Absence
// from a list, an API error, or a date/name match is NEVER proof of cancellation.
export async function reconcileSmoobuBooking(booking: SmoobuBooking) {
  if (!/^\d+$/.test(booking.id)) throw new Error("Invalid Smoobu reservation ID")
  const roomId = convertSmoobuApartmentIdToLocal(booking.roomId)
  if (!ROOM_MAPPINGS.some(room => room.localId === roomId) || booking.status === "blocked" || booking.isBlocked) return false
  stayDates(booking.arrival, booking.departure)
  const db = getAdminDb()
  await db.runTransaction(async tx => {
    // Transactional reads keep manual sync and webhook calls idempotent,
    // including legacy randomly-named documents and numeric/string IDs.
    const variants = [booking.id, Number(booking.id)]
    const find = async (collection: string) => {
      const results = await Promise.all(["smoobuId", "smoobuReservationId"].map(field => tx.get(db.collection(collection).where(field, "in", variants))))
      return [...new Map(results.flatMap(result => result.docs).map(doc => [doc.id, doc])).values()]
    }
    const existing = await find("bookings")
    const bookingIds = existing.map(doc => doc.id)
    const byBooking = await Promise.all(bookingIds.map(id => tx.get(db.collection("blocked_dates").where("bookingId", "==", id))))
    const blocks = [...new Map([...(await find("blocked_dates")), ...byBooking.flatMap(result => result.docs)].map(doc => [doc.id, doc])).values()]
    const associated = blocks.filter(doc => linkedAutoBlock(doc.data(), booking.id, bookingIds))
    const modified = Date.parse((booking.modified || "").replace(" ", "T"))
    if (existing.some(doc => Date.parse(doc.data().smoobuModifiedAt || "") > modified)) return
    if (booking.status !== "cancelled" && existing.some(doc => doc.data().status === "cancelled" && Date.parse(doc.data().smoobuModifiedAt || "") >= modified)) return
    const cancelled = booking.status === "cancelled"
    const syncedAt = new Date().toISOString()
    const primary = existing[0]?.ref || db.collection("bookings").doc(`smoobu_${booking.id}`)
    const common = {
      checkIn: `${booking.arrival}T00:00:00.000Z`, checkOut: `${booking.departure}T00:00:00.000Z`,
      roomId, roomName: getRoomName(roomId), smoobuId: booking.id,
      smoobuApartmentId: booking.roomId, syncedAt,
      smoobuModifiedAt: Number.isFinite(modified) ? new Date(modified).toISOString() : syncedAt,
    }
    const targets = existing.length ? existing : [{ ref: primary, data: () => ({}) }]
    for (const document of targets) {
      const old: Record<string, any> = document.data()
      // Payment records and quoted totals of website bookings stay untouched.
      const external = old.origin !== "site"
      tx.set(document.ref, {
        ...common,
        status: cancelled ? "cancelled" : ["paid", "payment_scheduled"].includes(old.status) ? old.status : "confirmed",
        ...(external ? {
          guests: booking.numAdult + booking.numChild, guestFirst: booking.firstName, guestLast: booking.lastName,
          firstName: booking.firstName, lastName: booking.lastName, email: booking.email, phone: booking.phone,
          notes: booking.notes || "", total: booking.price, currency: "EUR", origin: booking.referer,
          channelName: booking.channelName || booking.apiSource || booking.referer,
        } : {}),
        ...(!existing.length ? { createdAt: booking.created || syncedAt } : {}),
      }, { merge: true })
    }
    if (cancelled) {
      // Soft-release retains dates and audit history. No remote API writes.
      for (const block of associated) tx.set(block.ref, { status: "cancelled", releasedAt: syncedAt, releaseReason: "smoobu-cancellation" }, { merge: true })
    } else {
      const blockRefs = associated.length ? associated.map(doc => doc.ref) : [db.collection("blocked_dates").doc(`smoobu_${booking.id}`)]
      for (const ref of blockRefs) tx.set(ref, {
        roomId, from: common.checkIn, to: common.checkOut, reason: "auto-booking-smoobu",
        source: "smoobu-reservation", bookingId: primary.id, autoBlocked: true,
        smoobuReservationId: booking.id, syncedToSmoobu: true, status: "active", syncedAt,
      }, { merge: true })
    }
  })
  return true
}

export async function syncSmoobuBookings(from?: string, to?: string, source?: string) {
  await smoobuClient.getApartmentsCached()
  // Fetch every page first; apply active replacements before releasing blocks.
  const all = await smoobuClient.getBookings(from, to, undefined, true)
  const selected = all.filter(booking => !source || source === "all" || booking.referer === source)
  selected.sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled"))
  let synced = 0, skipped = 0, cancelled = 0
  const breakdown: Record<string, number> = { booking: 0, airbnb: 0, expedia: 0, direct: 0, other: 0 }
  const reconcile = async (booking: SmoobuBooking) => {
    const key = Object.hasOwn(breakdown, booking.referer) ? booking.referer : "other"
    breakdown[key]++
    if (await reconcileSmoobuBooking(booking)) {
      synced++
      if (booking.status === "cancelled") cancelled++
    } else skipped++
  }
  // Bounded concurrency; finish active reservations before any cancellations.
  for (const phase of [selected.filter(b => b.status !== "cancelled"), selected.filter(b => b.status === "cancelled")]) {
    for (let offset = 0; offset < phase.length; offset += 4) await Promise.all(phase.slice(offset, offset + 4).map(reconcile))
  }
  return { success: true, synced, skipped, cancelled, total: selected.length, breakdown }
}
