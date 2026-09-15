import { NextResponse } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { resolveToLocalRoomId } from "@/lib/room-mapping"
import { smoobuClient } from "@/lib/smoobu-client"

const HOLD_MINUTES = 45

function getStayDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const start = new Date(`${checkIn}T00:00:00.000Z`)
  const end = new Date(`${checkOut}T00:00:00.000Z`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates
  for (let date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function roomMatches(storedRoomId: unknown, requestedRoomId: string): boolean {
  if (!storedRoomId) return true
  return resolveToLocalRoomId(String(storedRoomId)) === resolveToLocalRoomId(requestedRoomId)
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis()
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillis === "function") return Number(toMillis.call(value))
  }
  const parsed = new Date(String(value || "")).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

async function getFirestoreConflicts(
  db: FirebaseFirestore.Firestore,
  roomId: string,
  requestedDates: Set<string>,
): Promise<string[]> {
  const unavailable = new Set<string>()
  const now = Date.now()
  const bookingsSnap = await db
    .collection("bookings")
    .where("status", "in", ["confirmed", "paid", "pending", "payment_scheduled"])
    .get()

  bookingsSnap.forEach((document) => {
    const booking = document.data()
    if (!roomMatches(booking.roomId, roomId)) return
    if (booking.status === "pending") {
      const expiresAt = timestampMillis(booking.holdExpiresAt)
      if (expiresAt !== null && expiresAt <= now) return
    }
    const start = String(booking.checkIn || "").slice(0, 10)
    const end = String(booking.checkOut || "").slice(0, 10)
    for (const date of getStayDates(start, end)) unavailable.add(date)
  })

  for (const collectionName of ["blocked_dates", "smoobu_bookings"]) {
    try {
      const snapshot = await db.collection(collectionName).get()
      snapshot.forEach((document) => {
        const item = document.data()
        if (item.status === "cancelled" || item.status === "canceled") return
        if (!roomMatches(item.roomId, roomId)) return
        const start = String(item.startDate || item.from || item.arrival || item.checkIn || "").slice(0, 10)
        const end = String(item.endDate || item.to || item.departure || item.checkOut || "").slice(0, 10)
        for (const date of getStayDates(start, end)) unavailable.add(date)
      })
    } catch (error) {
      console.warn(`[Create Booking] Could not read ${collectionName}:`, error)
    }
  }

  return [...requestedDates].filter((date) => unavailable.has(date))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || "").trim()
    const firstName = String(body.firstName || "").trim()
    const lastName = String(body.lastName || "").trim()
    const checkIn = String(body.checkIn || "").slice(0, 10)
    const checkOut = String(body.checkOut || "").slice(0, 10)
    const roomId = String(body.roomId || "").trim()
    const roomName = String(body.roomName || "").trim()
    const guests = Number(body.guests)

    if (!email || !firstName || !lastName || !checkIn || !checkOut || !roomId || !guests) {
      return NextResponse.json({ error: "Compila tutti i campi obbligatori." }, { status: 400 })
    }

    const checkInDate = new Date(`${checkIn}T00:00:00.000Z`)
    const checkOutDate = new Date(`${checkOut}T00:00:00.000Z`)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime()) ||
      checkInDate < today ||
      checkOutDate <= checkInDate
    ) {
      return NextResponse.json({ error: "Le date selezionate non sono valide." }, { status: 400 })
    }

    const apartmentId = await smoobuClient.resolveApartmentId(roomId, roomName)
    if (!apartmentId) {
      console.error("[Create Booking] No Smoobu apartment mapping for room", roomId, roomName)
      return NextResponse.json(
        { error: "Disponibilita non verificabile per questa camera. Riprova tra poco.", code: "ROOM_NOT_MAPPED" },
        { status: 503 },
      )
    }

    let availableOnSmoobu: boolean
    try {
      availableOnSmoobu = await smoobuClient.checkAvailability(String(apartmentId), checkIn, checkOut)
    } catch (error) {
      console.error("[Create Booking] Live Smoobu availability check failed:", error)
      return NextResponse.json(
        { error: "Non riusciamo a verificare Smoobu in questo momento. Riprova tra poco.", code: "AVAILABILITY_CHECK_FAILED" },
        { status: 503 },
      )
    }
    if (!availableOnSmoobu) {
      return NextResponse.json(
        { error: "Le date selezionate non sono disponibili.", code: "DATES_UNAVAILABLE" },
        { status: 409 },
      )
    }

    const db = getAdminDb()
    const stayDates = getStayDates(checkIn, checkOut)
    const firestoreConflicts = await getFirestoreConflicts(db, roomId, new Set(stayDates))
    if (firestoreConflicts.length > 0) {
      return NextResponse.json(
        { error: "Le date selezionate non sono disponibili.", code: "DATES_UNAVAILABLE", conflictDates: firestoreConflicts },
        { status: 409 },
      )
    }

    const canonicalRoomId = resolveToLocalRoomId(roomId)
    const bookingRef = db.collection("bookings").doc()
    const holdExpiresAt = Timestamp.fromMillis(Date.now() + HOLD_MINUTES * 60 * 1000)
    const lockRefs = stayDates.map((date) =>
      db.collection("booking_date_locks").doc(`${canonicalRoomId}_${date}`),
    )
    const nights = stayDates.length
    const pricePerNight = Number(body.pricePerNight || 0)
    const submittedTotal = Number(body.totalAmount)
    const totalAmount = Number.isFinite(submittedTotal)
      ? Math.round(submittedTotal * 100) / 100
      : Math.round(pricePerNight * nights * 100) / 100
    const bookingData = {
      bookingId: bookingRef.id,
      userId: null,
      email,
      firstName,
      lastName,
      phone: String(body.phone || ""),
      checkIn,
      checkOut,
      guests,
      numberOfChildren: Number(body.numberOfChildren || 0),
      roomType: String(body.roomType || canonicalRoomId),
      roomName: roomName || `Camera ${canonicalRoomId}`,
      roomId: canonicalRoomId,
      smoobuApartmentId: apartmentId,
      nights,
      pricePerNight,
      subtotal: Number(body.subtotal || pricePerNight * nights),
      taxes: Number(body.taxes || 0),
      serviceFee: Number(body.serviceFee || 0),
      totalAmount,
      totalAmountCents: Math.round(totalAmount * 100),
      notes: String(body.notes || body.specialRequests || ""),
      specialRequests: String(body.specialRequests || body.notes || ""),
      status: "pending",
      origin: "site",
      currency: "EUR",
      holdExpiresAt,
      paymentProvider: null,
      paymentId: null,
      paidAt: null,
      smoobuReservationId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    try {
      await db.runTransaction(async (transaction) => {
        const lockSnapshots = await Promise.all(lockRefs.map((reference) => transaction.get(reference)))
        const now = Date.now()
        const activeConflict = lockSnapshots.find((snapshot) => {
          if (!snapshot.exists) return false
          const expiresAt = timestampMillis(snapshot.data()?.expiresAt)
          return expiresAt === null || expiresAt > now
        })
        if (activeConflict) throw new Error("BOOKING_DATE_LOCK_CONFLICT")

        transaction.set(bookingRef, bookingData)
        lockRefs.forEach((reference, index) => {
          transaction.set(reference, {
            bookingId: bookingRef.id,
            roomId: canonicalRoomId,
            date: stayDates[index],
            expiresAt: holdExpiresAt,
            createdAt: FieldValue.serverTimestamp(),
          })
        })
      })
    } catch (error) {
      if (error instanceof Error && error.message === "BOOKING_DATE_LOCK_CONFLICT") {
        return NextResponse.json(
          { error: "Le date sono appena state selezionate da un altro ospite. Scegli altre date.", code: "DATES_UNAVAILABLE" },
          { status: 409 },
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, bookingId: bookingRef.id })
  } catch (error) {
    console.error("[Create Booking Error]:", error)
    return NextResponse.json(
      { error: "Non e stato possibile creare la prenotazione. Riprova tra poco." },
      { status: 500 },
    )
  }
}
