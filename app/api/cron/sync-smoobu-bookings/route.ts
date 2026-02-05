import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Cron job che sincronizza prenotazioni da Smoobu e blocca/sblocca date automaticamente
 * - Legge prenotazioni da Smoobu (Booking.com, Airbnb, Expedia, dirette)
 * - Sincronizza con Firebase
 * - Blocca automaticamente le date delle prenotazioni confermate
 * - Sblocca le date delle prenotazioni cancellate
 * - Blocca le date passate
 * URL: https://al22suite.com/api/cron/sync-smoobu-bookings
 * Frequenza: Ogni 2 ore
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken || token !== expectedToken) {
      console.error("[Smoobu] Unauthorized sync attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Smoobu] Starting bidirectional sync and auto-blocking...")

    const db = getAdminDb()
    const now = new Date()

    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
    const to = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    // Step 1: Fetch bookings from Smoobu
    console.log(`[Smoobu] Step 1: Fetching bookings from Smoobu (${from} to ${to})`)
    const smoobuBookings = await smoobuClient.getBookings(from, to)
    console.log(`[Smoobu] Retrieved ${smoobuBookings.length} bookings from Smoobu`)

    let syncedBookings = 0
    for (const booking of smoobuBookings) {
      try {
        const departureDate = new Date(booking.departure)
        if (departureDate < now) continue

        // Use the referer already mapped by smoobu-client (uses correct channel IDs)
        const bookingSource = booking.referer || "other"
        
        // Skip blocked and unknown bookings
        if (bookingSource === "blocked" || bookingSource === "other") {
          continue
        }
        
        // Map "direct" to "site" for consistency with existing data
        const origin = bookingSource === "direct" ? "site" : bookingSource

        // Check if already exists by smoobuId or beds24Id (backward compat)
        const existingBySmoobu = await db
          .collection("bookings")
          .where("smoobuId", "==", booking.id)
          .limit(1)
          .get()

        if (existingBySmoobu.empty) {
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
            origin: origin,
            roomId: booking.roomId.toString(),
            roomName: getRoomName(booking.roomId.toString()),
            smoobuId: booking.id,
            channelId: booking.apiSourceId,
            channelName: booking.apiSource,
            createdAt: booking.created || new Date().toISOString(),
            syncedAt: new Date().toISOString(),
          })
          syncedBookings++
          console.log(`[Smoobu] Synced new booking ${booking.id} from ${origin} (channel: ${booking.apiSource})`)
        }
      } catch (error) {
        console.error(`[Smoobu] Error syncing booking ${booking.id}:`, error)
      }
    }

    // Step 2: Auto-block dates for confirmed bookings
    console.log("[Smoobu] Step 2: Reading all confirmed bookings from database")
    const allBookingsSnapshot = await db
      .collection("bookings")
      .where("status", "in", ["confirmed", "paid"])
      .get()

    const allBookings = allBookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log(`[Smoobu] Found ${allBookings.length} confirmed bookings to process`)

    let newBlocks = 0
    let smoobuBlocks = 0
    for (const booking of allBookings) {
      try {
        const checkInDate = new Date(booking.checkIn)
        const checkOutDate = new Date(booking.checkOut)
        
        if (checkOutDate < now) continue

        const fromDate = checkInDate.toISOString().split("T")[0]
        const toDate = checkOutDate.toISOString().split("T")[0]

        const existingBlock = await db
          .collection("blocked_dates")
          .where("roomId", "==", booking.roomId)
          .where("from", "==", fromDate)
          .where("to", "==", toDate)
          .where("bookingId", "==", booking.id)
          .limit(1)
          .get()

        if (existingBlock.empty) {
          let syncedToSmoobu = !!booking.smoobuId
          let smoobuReservationId = booking.smoobuId || null

          // Block on Smoobu if it's a website booking without smoobuId
          if (booking.origin === "site" && !booking.smoobuId) {
            try {
              console.log(`[Smoobu] Blocking dates on Smoobu for website booking ${booking.id}`)
              const blockResult = await smoobuClient.blockDates(
                booking.roomId,
                fromDate,
                toDate,
                `website-booking-${booking.id}`
              )
                
              if (blockResult) {
                syncedToSmoobu = true
                smoobuReservationId = blockResult
                smoobuBlocks++
                
                await db.collection("bookings").doc(booking.id).update({
                  smoobuId: blockResult,
                  syncedToSmoobu: true,
                  smoobuSyncedAt: new Date().toISOString(),
                })
                
                console.log(`[Smoobu] Blocked on Smoobu with ID ${blockResult}`)
              }
            } catch (smoobuError) {
              console.error(`[Smoobu] Error blocking for booking ${booking.id}:`, smoobuError)
            }
          }

          await db.collection("blocked_dates").add({
            roomId: booking.roomId,
            from: fromDate,
            to: toDate,
            reason: `auto-booking-${booking.origin || "site"}`,
            bookingId: booking.id,
            smoobuReservationId,
            syncedToSmoobu,
            createdAt: new Date().toISOString(),
            autoBlocked: true,
          })
          
          newBlocks++
        }
      } catch (error) {
        console.error(`[Smoobu] Error blocking dates for booking ${booking.id}:`, error)
      }
    }

    // Step 3: Remove blocks for cancelled bookings
    console.log("[Smoobu] Step 3: Removing blocks for cancelled bookings")
    const autoBlocksSnapshot = await db
      .collection("blocked_dates")
      .where("autoBlocked", "==", true)
      .get()

    let removedBlocks = 0
    for (const blockDoc of autoBlocksSnapshot.docs) {
      const block = blockDoc.data()
      
      if (block.bookingId) {
        const bookingSnapshot = await db
          .collection("bookings")
          .doc(block.bookingId)
          .get()

        if (!bookingSnapshot.exists || 
            bookingSnapshot.data()?.status === "cancelled") {
          await blockDoc.ref.delete()
          removedBlocks++
          console.log(`[Smoobu] Removed auto-block for cancelled booking ${block.bookingId}`)
        }
      }
    }

    // Step 4: Block past dates
    console.log("[Smoobu] Step 4: Blocking past dates")
    const roomIds = ["2", "3"]
    let pastBlocks = 0

    for (const roomId of roomIds) {
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
          syncedToSmoobu: false,
          createdAt: new Date().toISOString(),
          autoBlocked: true,
        })
        pastBlocks++
      } else {
        await existingPastBlock.docs[0].ref.update({ to: pastTo })
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      syncedFromSmoobu: syncedBookings,
      totalConfirmedBookings: allBookings.length,
      newBlocksCreated: newBlocks,
      smoobuBlocksCreated: smoobuBlocks,
      blocksRemoved: removedBlocks,
      pastDatesBlocked: pastBlocks,
    }

    console.log("[Smoobu] Sync completed:", result)

    if (process.env.ALERT_EMAIL && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: process.env.ALERT_EMAIL,
          subject: "Sincronizzazione Smoobu Completata",
          html: `
            <h2>Sincronizzazione Smoobu Completata</h2>
            <p><strong>Timestamp:</strong> ${result.timestamp}</p>
            <p><strong>Prenotazioni sincronizzate da Smoobu:</strong> ${syncedBookings}</p>
            <p><strong>Prenotazioni confermate totali:</strong> ${allBookings.length}</p>
            <p><strong>Nuovi blocchi creati:</strong> ${newBlocks}</p>
            <p><strong>Blocchi su Smoobu:</strong> ${smoobuBlocks}</p>
            <p><strong>Blocchi rimossi:</strong> ${removedBlocks}</p>
            <p><strong>Date passate bloccate:</strong> ${pastBlocks > 0 ? "si" : "gia bloccate"}</p>
          `,
        })
      } catch (emailError) {
        console.error("[Smoobu] Error sending success email:", emailError)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Smoobu] Sync failed:", error)

    if (process.env.ALERT_EMAIL && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: process.env.ALERT_EMAIL,
          subject: "ERRORE: Sincronizzazione Smoobu Fallita",
          html: `
            <h2>Errore Sincronizzazione Smoobu</h2>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Errore:</strong> ${error instanceof Error ? error.message : "Unknown error"}</p>
            <p>Controlla i log del server per maggiori dettagli.</p>
          `,
        })
      } catch (emailError) {
        console.error("[Smoobu] Error sending error email:", emailError)
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
