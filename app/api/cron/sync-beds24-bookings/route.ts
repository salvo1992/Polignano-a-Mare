import { NextResponse } from "next/server"
import { beds24Client } from "@/lib/beds24-client"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Cron job che sincronizza e blocca/sblocca date automaticamente ogni 2 ore
 * - Legge TUTTE le prenotazioni dal DB (sito, Booking, Airbnb)
 * - Blocca automaticamente le date delle prenotazioni confermate
 * - Sblocca le date delle prenotazioni cancellate
 * - Blocca tutte le date passate per prevenire prenotazioni nel passato
 * URL: https://al22suite.com/api/cron/sync-beds24-bookings
 * Frequenza: Ogni 2 ore
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken || token !== expectedToken) {
      console.error("[v0] Unauthorized sync attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting bidirectional sync and auto-blocking...")

    const db = getAdminDb()
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
    const to = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    console.log(`[v0] Step 1: Fetching bookings from Beds24 (${from} to ${to})`)
    const beds24Bookings = await beds24Client.getBookings(from, to, true)
    console.log(`[v0] Retrieved ${beds24Bookings.length} bookings from Beds24`)

    let syncedBookings = 0
    for (const booking of beds24Bookings) {
      try {
        const departureDate = new Date(booking.departure)
        if (departureDate < now) continue

        let bookingSource = "other"
        if (booking.apiSourceId === 19) bookingSource = "booking"
        else if (booking.apiSourceId === 10 || booking.apiSourceId === 46) bookingSource = "airbnb"
        
        if (bookingSource === "other") continue

        const bookingsSnapshot = await db
          .collection("bookings")
          .where("beds24Id", "==", booking.id)
          .limit(1)
          .get()

        if (bookingsSnapshot.empty) {
          const checkInDate = new Date(booking.arrival + "T00:00:00.000Z").toISOString()
          const checkOutDate = new Date(booking.departure + "T00:00:00.000Z").toISOString()

          await db.collection("bookings").add({
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: booking.numAdult + booking.numChild,
            firstName: booking.firstName,
            lastName: booking.lastName,
            email: booking.email || "",
            phone: booking.phone || "",
            notes: booking.notes || "",
            totalAmount: booking.price || 0,
            currency: "EUR",
            status: booking.status === "confirmed" ? "confirmed" : "pending",
            origin: bookingSource,
            roomId: booking.roomId.toString(),
            roomName: getRoomName(booking.roomId.toString()),
            beds24Id: booking.id,
            apiSourceId: booking.apiSourceId,
            createdAt: new Date(booking.created).toISOString(),
            syncedAt: new Date().toISOString(),
          })
          syncedBookings++
          console.log(`[v0] Synced new booking ${booking.id} from ${bookingSource}`)
        }
      } catch (error) {
        console.error(`[v0] Error syncing booking ${booking.id}:`, error)
      }
    }

    console.log("[v0] Step 2: Reading all confirmed bookings from database")
    const allBookingsSnapshot = await db
      .collection("bookings")
      .where("status", "in", ["confirmed", "paid"])
      .get()

    const allBookings = allBookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log(`[v0] Found ${allBookings.length} confirmed bookings to process`)

    let newBlocks = 0
    let beds24Blocks = 0
    for (const booking of allBookings) {
      try {
        const checkInDate = new Date(booking.checkIn)
        const checkOutDate = new Date(booking.checkOut)
        
        // Skip se già passata
        if (checkOutDate < now) continue

        const fromDate = checkInDate.toISOString().split("T")[0]
        const toDate = checkOutDate.toISOString().split("T")[0]

        // Controlla se già bloccato nel DB locale
        const existingBlock = await db
          .collection("blocked_dates")
          .where("roomId", "==", booking.roomId)
          .where("from", "==", fromDate)
          .where("to", "==", toDate)
          .where("bookingId", "==", booking.id)
          .limit(1)
          .get()

        if (existingBlock.empty) {
          let syncedToBeds24 = !!booking.beds24Id
          let beds24BookingId = booking.beds24Id || null

          if (booking.origin === "website" && !booking.beds24Id) {
            try {
              console.log(`[v0] Blocking dates on Beds24 for website booking ${booking.id}, room ${booking.roomId}`)
              
              // Usa direttamente il roomId della prenotazione (2 = Deluxe, 3 = Suite)
              const blockResult = await beds24Client.blockDates(
                booking.roomId, // Usa direttamente "2" o "3"
                fromDate,
                toDate,
                `website-booking-${booking.id}`
              )
                
              if (blockResult.success && blockResult.bookingId) {
                syncedToBeds24 = true
                beds24BookingId = blockResult.bookingId
                beds24Blocks++
                
                // Aggiorna la prenotazione con il beds24Id
                await db.collection("bookings").doc(booking.id).update({
                  beds24Id: blockResult.bookingId,
                  syncedToBeds24: true,
                  beds24SyncedAt: new Date().toISOString(),
                })
                
                console.log(`[v0] Blocked on Beds24 with ID ${blockResult.bookingId}`)
              }
            } catch (beds24Error) {
              console.error(`[v0] Error blocking on Beds24 for booking ${booking.id}:`, beds24Error)
            }
          }

          await db.collection("blocked_dates").add({
            roomId: booking.roomId,
            from: fromDate,
            to: toDate,
            reason: `auto-booking-${booking.origin || "site"}`,
            bookingId: booking.id,
            beds24BookingId,
            syncedToBeds24,
            createdAt: new Date().toISOString(),
            autoBlocked: true,
          })
          
          newBlocks++
          console.log(`[v0] Auto-blocked ${fromDate} to ${toDate} for room ${booking.roomId} (booking ${booking.id})`)
        }
      } catch (error) {
        console.error(`[v0] Error blocking dates for booking ${booking.id}:`, error)
      }
    }

    console.log("[v0] Step 4: Removing blocks for cancelled bookings")
    const autoBlocksSnapshot = await db
      .collection("blocked_dates")
      .where("autoBlocked", "==", true)
      .get()

    let removedBlocks = 0
    for (const blockDoc of autoBlocksSnapshot.docs) {
      const block = blockDoc.data()
      
      if (block.bookingId) {
        // Controlla se la prenotazione esiste ancora ed è confermata
        const bookingSnapshot = await db
          .collection("bookings")
          .doc(block.bookingId)
          .get()

        if (!bookingSnapshot.exists || 
            bookingSnapshot.data()?.status === "cancelled") {
          await blockDoc.ref.delete()
          removedBlocks++
          console.log(`[v0] Removed auto-block for cancelled booking ${block.bookingId}`)
        }
      }
    }

    console.log("[v0] Step 5: Blocking past dates")
    const roomIds = ["2", "3"] // Deluxe e Suite
    let pastBlocks = 0

    for (const roomId of roomIds) {
      // Blocca dal 2020-01-01 fino a ieri
      const pastFrom = "2020-01-01"
      const pastTo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      const existingPastBlock = await db
        .collection("blocked_dates")
        .where("roomId", "==", roomId)
        .where("reason", "==", "past-dates")
        .limit(1)
        .get()

      if (existingPastBlock.empty) {
        await db.collection("blocked_dates").add({
          roomId,
          from: pastFrom,
          to: pastTo,
          reason: "past-dates",
          syncedToBeds24: false,
          createdAt: new Date().toISOString(),
          autoBlocked: true,
        })
        pastBlocks++
        console.log(`[v0] Blocked past dates for room ${roomId}`)
      } else {
        // Aggiorna il blocco delle date passate fino a ieri
        await existingPastBlock.docs[0].ref.update({
          to: pastTo,
        })
        console.log(`[v0] Updated past dates block for room ${roomId} to ${pastTo}`)
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      syncedFromBeds24: syncedBookings,
      totalConfirmedBookings: allBookings.length,
      newBlocksCreated: newBlocks,
      beds24BlocksCreated: beds24Blocks,
      blocksRemoved: removedBlocks,
      pastDatesBlocked: pastBlocks,
    }

    console.log("[v0] Sync completed:", result)

    if (process.env.ALERT_EMAIL && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: process.env.ALERT_EMAIL,
          subject: "Sincronizzazione Calendario Completata",
          html: `
            <h2>Sincronizzazione Calendario Completata</h2>
            <p><strong>Timestamp:</strong> ${result.timestamp}</p>
            <p><strong>Prenotazioni sincronizzate da Beds24:</strong> ${syncedBookings}</p>
            <p><strong>Prenotazioni confermate totali:</strong> ${allBookings.length}</p>
            <p><strong>Nuovi blocchi creati:</strong> ${newBlocks}</p>
            <p><strong>Blocchi su Beds24:</strong> ${beds24Blocks}</p>
            <p><strong>Blocchi rimossi:</strong> ${removedBlocks}</p>
            <p><strong>Date passate bloccate:</strong> ${pastBlocks > 0 ? "✓" : "già bloccate"}</p>
          `,
        })
      } catch (emailError) {
        console.error("[v0] Error sending success email:", emailError)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Sync failed:", error)

    if (process.env.ALERT_EMAIL && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: process.env.ALERT_EMAIL,
          subject: "ERRORE: Sincronizzazione Calendario Fallita",
          html: `
            <h2>Errore Sincronizzazione Calendario</h2>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Errore:</strong> ${error instanceof Error ? error.message : "Unknown error"}</p>
            <p>Controlla i log del server per maggiori dettagli.</p>
          `,
        })
      } catch (emailError) {
        console.error("[v0] Error sending error email:", emailError)
      }
    }

    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

function getRoomName(roomId: string): string {
  const roomMap: Record<string, string> = {
    "2": "Camera Deluxe",
    "3": "Camera Suite",
  }
  return roomMap[roomId] || `Camera ${roomId}`
}
