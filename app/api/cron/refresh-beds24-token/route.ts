import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { beds24Client } from '@/lib/beds24-client'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    // -----------------------------
    // 🔐 AUTENTICAZIONE CRON
    // -----------------------------
    const authHeader = request.headers.get("authorization") ?? ""
    const cronSecret = process.env.CRON_SECRET ?? ""

    // Estrai token dall'header: "Bearer xxx"
    const [, token] = authHeader.split(" ")

    // Confronto robusto
    if (!token || !cronSecret || token.trim() !== cronSecret.trim()) {
      console.log("[CRON WRITE] Unauthorized", { authHeader })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[CRON WRITE] Starting Beds24 write token refresh")

    // -----------------------------
    // 🔄 REFRESH WRITE TOKEN
    // -----------------------------
    await beds24Client.forceRefreshWriteToken()

    console.log("[CRON WRITE] Write token refreshed successfully")

    return NextResponse.json({
      success: true,
      message: "Write token refreshed successfully",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRON WRITE] Error refreshing write token:", error)

    // 📨 invio email di errore (solo se Resend configurato)
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: process.env.ALERT_EMAIL!,
        subject: "⚠️ Beds24 Write Token Refresh Fallito",
        html: `
          <h2>Problema con il Write Token Beds24</h2>
          <p>Il cron non è riuscito a rigenerare il token di scrittura.</p>
          <p><strong>Errore:</strong> ${JSON.stringify(error)}</p>
        `
      })
    } catch (emailError) {
      console.error("[CRON WRITE] Failed to send email:", emailError)
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
