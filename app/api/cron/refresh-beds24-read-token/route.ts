import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    console.log("[CRON READ] Starting Beds24 read token refresh check")

    // -----------------------------
    // 🔍 LETTURA REFRESH TOKEN
    // -----------------------------
    const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN
    if (!storedRefreshToken) {
      throw new Error("BEDS24_REFRESH_TOKEN not found in environment variables")
    }

    const tokenDoc = await getDoc(doc(db, "system", "beds24_tokens"))
    const tokenData = tokenDoc.data()

    const now = Date.now()
    const lastRefresh = tokenData?.readTokenRefreshedAt || 0
    const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24)

    console.log("[CRON READ] Days since last read token refresh:", Math.floor(daysSinceRefresh))

    // -----------------------------
    // ⏳ TOKEN ANCORA VALIDO
    // -----------------------------
    if (daysSinceRefresh < 55) {
      return NextResponse.json({
        success: true,
        message: "Read token still valid",
        daysSinceRefresh: Math.floor(daysSinceRefresh),
        nextRefreshIn: Math.floor(55 - daysSinceRefresh)
      })
    }

    // -----------------------------
    // 🔄 REFRESH DEL READ TOKEN
    // -----------------------------
     console.log('[CRON] Read token needs refresh, calling Beds24 /authentication/token')

    const response = await fetch('https://beds24.com/api/v2/authentication/token', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        refreshToken: storedRefreshToken,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[CRON READ] Beds24 read token refresh failed:", response.status, errorText)
      throw new Error(`Beds24 API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.token) {
      throw new Error("No read token in Beds24 response")
    }

    await setDoc(
      doc(db, "system", "beds24_tokens"),
      {
        readToken: data.token,
        readTokenRefreshedAt: now,
        readTokenExpiresIn: data.expiresIn || 5184000,
      },
      { merge: true }
    )

    console.log("[CRON READ] Read token refreshed and saved successfully")

    return NextResponse.json({
      success: true,
      message: "Read token refreshed successfully",
      expiresIn: data.expiresIn,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRON READ] Error refreshing read token:", error)

    // -----------------------------
    // 📨  INVIO EMAIL DI ERRORE
    // -----------------------------
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: process.env.ALERT_EMAIL!, // Email gestita da variabile ENV
        subject: "⚠️ Beds24 Read Token Refresh Fallito",
        html: `
          <h2>Problema con il Read Token Beds24</h2>
          <p>Il cron non è riuscito a rigenerare il read token.</p>
          <p><strong>Errore:</strong> ${JSON.stringify(error)}</p>
          <h3>Azione consigliata:</h3>
          <ol>
            <li>Controlla la variabile BEDS24_REFRESH_TOKEN su Vercel</li>
            <li>Se necessario, rigenera il refresh token da Beds24</li>
          </ol>
        `,
      })
    } catch (emailError) {
      console.error("[CRON READ] Failed to send error email:", emailError)
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}





