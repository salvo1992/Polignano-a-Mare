import { NextResponse } from "next/server"
import { smoobuClient } from "@/lib/smoobu-client"
import { isFirebaseInitialized, getFirestore } from "@/lib/firebase-admin"

/**
 * POST /api/smoobu/sync-reviews
 * 
 * Auto-sync: fetches completed bookings from Smoobu and creates review entries
 * in Firebase automatically. Reviews are "verified stay" records — no manual
 * text entry required. The admin can only toggle visibility (hidden field).
 * 
 * Also supports:
 *  - action: "toggle-visibility" — hide/show a single review
 *  - action: "add-manual"        — admin adds a fully custom review
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    // ---------- Toggle visibility ----------
    if (action === "toggle-visibility") {
      if (!isFirebaseInitialized()) {
        return NextResponse.json({ success: false, error: "Firebase non inizializzato" }, { status: 503 })
      }
      const { reviewId, hidden } = body
      if (!reviewId) {
        return NextResponse.json({ success: false, error: "reviewId obbligatorio" }, { status: 400 })
      }
      const db = getFirestore()
      await db.collection("reviews").doc(reviewId).update({ hidden: !!hidden, updatedAt: Date.now() })
      return NextResponse.json({ success: true, message: hidden ? "Recensione nascosta" : "Recensione visibile" })
    }

    // ---------- Admin adds a fully custom review ----------
    if (action === "add-manual") {
      if (!isFirebaseInitialized()) {
        return NextResponse.json({ success: false, error: "Firebase non inizializzato" }, { status: 503 })
      }
      const { name, location, rating, comment, source, date } = body
      if (!name || !comment || !rating) {
        return NextResponse.json({ success: false, error: "Nome, commento e rating obbligatori" }, { status: 400 })
      }
      const db = getFirestore()
      const docRef = await db.collection("reviews").add({
        name: name.trim(),
        location: (location || "").trim(),
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment.trim(),
        source: source || "manual",
        date: date || new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
        verified: true,
        hidden: false,
        manualEntry: true,
        createdAt: Date.now(),
        syncedAt: new Date().toISOString(),
      })
      return NextResponse.json({ success: true, reviewId: docRef.id, message: "Recensione aggiunta" })
    }

    // ---------- Default: auto-sync from Smoobu completed bookings ----------
    if (!isFirebaseInitialized()) {
      return NextResponse.json({ success: false, error: "Firebase non inizializzato" }, { status: 503 })
    }

    // 1) Fetch completed bookings from Smoobu
    const completedBookings = await smoobuClient.getCompletedChannelBookings()
    if (completedBookings.length === 0) {
      return NextResponse.json({ success: true, created: 0, skipped: 0, total: 0, message: "Nessun soggiorno completato trovato" })
    }

    // 2) Get existing reviews from Firebase to avoid duplicates
    const db = getFirestore()
    const existingSnap = await db.collection("reviews").get()
    const existingSmoobuIds = new Set<string>()
    const existingNames = new Map<string, Set<string>>() // name -> set of sources
    for (const doc of existingSnap.docs) {
      const data = doc.data()
      if (data.smoobuId) existingSmoobuIds.add(data.smoobuId)
      const key = (data.name || "").toLowerCase().trim()
      if (!existingNames.has(key)) existingNames.set(key, new Set())
      existingNames.get(key)!.add(data.source || "")
    }

    // 3) Create review entries from each completed booking
    let created = 0
    let skipped = 0

    for (const booking of completedBookings) {
      const guestName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim()
      if (!guestName || guestName === "BLOCKED" || guestName.toLowerCase().includes("blocked")) {
        skipped++
        continue
      }

      // Skip if already synced by smoobuId
      if (existingSmoobuIds.has(booking.id)) {
        skipped++
        continue
      }

      // Skip if same guest name + same source already exists (avoid near-duplicates)
      const nameKey = guestName.toLowerCase().trim()
      if (existingNames.has(nameKey) && existingNames.get(nameKey)!.has(booking.referer)) {
        skipped++
        continue
      }

      const arrivalDate = new Date(booking.arrival)
      const departureDate = new Date(booking.departure)
      const nights = Math.max(1, Math.round((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)))
      const dateStr = arrivalDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })

      // Build a natural "verified stay" comment based on booking data
      const sourceLabel = booking.referer === "booking" ? "Booking.com"
        : booking.referer === "airbnb" ? "Airbnb"
        : booking.referer === "expedia" ? "Expedia"
        : "prenotazione diretta"

      const comment = `Soggiorno verificato di ${nights} nott${nights === 1 ? "e" : "i"} tramite ${sourceLabel}. Check-in: ${arrivalDate.toLocaleDateString("it-IT")}, Check-out: ${departureDate.toLocaleDateString("it-IT")}.`

      // Create the review — visible by default, rating based on a verified stay
      await db.collection("reviews").add({
        name: guestName,
        location: "",
        rating: 5, // Verified stays default to 5 stars
        comment,
        source: booking.referer || "direct",
        date: dateStr,
        verified: true,
        hidden: false,
        smoobuId: booking.id,
        bookingId: booking.id,
        arrival: booking.arrival,
        departure: booking.departure,
        channelName: booking.channelName || booking.apiSource || "",
        nights,
        autoGenerated: true,
        createdAt: Date.now(),
        syncedAt: new Date().toISOString(),
      })

      created++
      existingSmoobuIds.add(booking.id)
      if (!existingNames.has(nameKey)) existingNames.set(nameKey, new Set())
      existingNames.get(nameKey)!.add(booking.referer)
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: completedBookings.length,
      message: `Sincronizzazione completata: ${created} nuove recensioni create, ${skipped} gia presenti.`,
    })
  } catch (error) {
    console.error("[sync-reviews] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 },
    )
  }
}

/**
 * GET /api/smoobu/sync-reviews
 * 
 * Fetches all reviews from Firebase for the admin panel.
 * Supports: ?hidden=true to include hidden reviews, default shows all.
 */
export async function GET(req: Request) {
  if (!isFirebaseInitialized()) {
    return NextResponse.json({
      success: true,
      reviews: [],
      stats: { total: 0, visible: 0, hidden: 0, averageRating: 0, bySource: {} },
    })
  }

  try {
    const { searchParams } = new URL(req.url)
    const includeHidden = searchParams.get("includeHidden") === "true"
    const limitParam = parseInt(searchParams.get("limit") || "200")

    const db = getFirestore()
    const snapshot = await db.collection("reviews").orderBy("createdAt", "desc").limit(limitParam).get()

    const allReviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // If not admin request, filter out hidden
    const reviews = includeHidden ? allReviews : allReviews.filter((r: any) => !r.hidden)

    // Stats
    const visibleReviews = allReviews.filter((r: any) => !r.hidden && r.rating > 0)
    const hiddenReviews = allReviews.filter((r: any) => r.hidden)
    const avgRating = visibleReviews.length > 0
      ? visibleReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / visibleReviews.length
      : 0

    const bySource: Record<string, number> = {}
    for (const r of visibleReviews) {
      const src = (r as any).source || "other"
      bySource[src] = (bySource[src] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      reviews,
      stats: {
        total: allReviews.length,
        visible: visibleReviews.length,
        hidden: hiddenReviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
        bySource,
      },
    })
  } catch (error) {
    console.error("[sync-reviews] GET Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
