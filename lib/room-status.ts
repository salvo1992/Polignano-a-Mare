import { resolveToLocalRoomId } from "./room-mapping"

export function isCancelled(item: { status?: unknown }) {
  return ["cancelled", "canceled", "cancellation"].includes(String(item.status || "").toLowerCase())
}

export function isBookingBlock(block: Record<string, any>) {
  return Boolean(block.bookingId) || /^auto-booking[:\-]/.test(String(block.reason || "")) ||
    block.source === "smoobu-reservation"
}

// When live Smoobu availability has been successfully checked, its own imported
// reservations/auto-blocks must not be overruled by a stale local copy. Keep all
// independent manual blocks and website bookings/holds as additional guards.
export function isProviderOccupancy(item: Record<string, any>, collection: string) {
  const hasId = Boolean(item.smoobuId || item.smoobuReservationId)
  if (collection === "blocked_dates") return hasId && isBookingBlock(item)
  return hasId && item.origin !== "site"
}

export function roomStatus(roomId: string, bookings: Record<string, any>[], blocks: Record<string, any>[], now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  const matches = (item: Record<string, any>) => !item.roomId || resolveToLocalRoomId(String(item.roomId)) === resolveToLocalRoomId(roomId)
  const includesToday = (from: unknown, to: unknown) => String(from || "").slice(0, 10) <= today && today < String(to || "").slice(0, 10)
  const activeBlocks = blocks.filter(block => !isCancelled(block) && matches(block) &&
    includesToday(block.from || block.startDate, block.to || block.endDate))
  const occupied = bookings.some(booking => {
    if (!matches(booking) || !["confirmed", "paid", "pending", "payment_scheduled"].includes(booking.status)) return false
    const expiry = booking.holdExpiresAt?.toMillis?.() ?? Date.parse(booking.holdExpiresAt)
    if (booking.status === "pending" && Number.isFinite(expiry) && expiry <= now.getTime()) return false
    return includesToday(booking.checkIn, booking.checkOut)
  })
  if (occupied || activeBlocks.some(isBookingBlock)) return "booked" as const
  return activeBlocks.length ? "maintenance" as const : "available" as const
}
