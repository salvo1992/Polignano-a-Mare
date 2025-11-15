import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // -----------------------------
    // 🔐 AUTENTICAZIONE CRON
    // -----------------------------
    const authHeader = request.headers.get("authorization") ?? ""
    const cronSecret = process.env.CRON_SECRET ?? ""

    const [, token] = authHeader.split(" ")

    if (!token || !cronSecret || token.trim() !== cronSecret.trim()) {
      console.log("[CRON READ] Unauthorized", { authHeader })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[CRON READ] Starting read token refresh check")

    // -----------------------------
    // 🔍 LETTURA REFRESH TOKEN
    // -----------------------------
    const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN
    if (!storedRefreshToken) {
      throw new Error("BEDS24_REFRESH_TOKEN non esiste nelle variabili ENV")
    }

    const tokenDoc = await getDoc(doc(db, "system", "beds24_tokens"))
    const tokenData = tokenDoc.data()

    const now = Date.now()
    const lastRefresh = tokenData?.readTokenRefreshedAt || 0
    const daysSince = (now - lastRefresh) / (1000 * 60 * 60 * 24)

    console.log("[CRON READ] Days since refresh:", Math.floor(daysSince))

    if (daysSince < 55) {
      return NextResponse.json({
        success: true,
        message: "Read token still valid",
        daysSinceRefresh: Math.floor(daysSince)
      })
    }

    // -----------------------------
    // 🔄 RIGENERA IL READ TOKEN
    // -----------------------------
    const response = await fetch(
      "https://beds24.com/api/v2/authentication/setup",
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "refreshToken": storedRefreshToken
        }
      }
    )

    if (!response.ok) {
      const txt = await response.text()
      console.error("[CRON READ] Error:", response.status, txt)
      throw new Error(`Beds24 API error: ${response.status} - ${txt}`)
    }

    const data = await response.json()

    if (!data.token) throw new Error("Beds24 ha risposto senza token")

    await setDoc(
      doc(db, "system", "beds24_tokens"),
      {
        readToken: data.token,
        readTokenRefreshedAt: now,
        readTokenExpiresIn: data.expiresIn
      },
      { merge: true }
    )

    console.log("[CRON READ] Read token salvato con successo")

    return NextResponse.json({
      success: true,
      message: "Read token refreshed successfully",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRON READ] Error refreshing read token:", error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}




