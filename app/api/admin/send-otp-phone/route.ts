import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { newPhone, userId } = await request.json()

    if (!newPhone || !userId) {
      return NextResponse.json({ error: "Missing newPhone or userId" }, { status: 400 })
    }

    const db = getAdminDb()
    
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    
    if (!userData || !userData.email) {
      return NextResponse.json({ 
        error: "Admin email not found." 
      }, { status: 400 })
    }

    const adminEmail = userData.email
    
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    await db.collection("admin_otp").doc("phone_change").set({
      otp,
      newPhone,
      userId,
      type: "phone",
      expiresAt,
      createdAt: Date.now(),
    })

    // Send OTP via email
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: adminEmail,
      subject: "Codice di Verifica - Cambio Numero di Telefono",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Codice di Verifica</h2>
          <p>Hai richiesto di modificare il numero di telefono del tuo account amministratore.</p>
          <p>Il tuo codice di verifica è:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #666;">Questo codice scadrà tra 10 minuti.</p>
          <p style="color: #666;">Se non hai richiesto questa modifica, ignora questa email.</p>
        </div>
      `,
    })

    console.log(`[v0] Phone change OTP sent to ${adminEmail}: ${otp}`)

    const maskedEmail = adminEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length))

    return NextResponse.json({ 
      success: true, 
      message: `Codice OTP inviato via email a ${maskedEmail}` 
    })
  } catch (error) {
    console.error("[v0] Error sending phone OTP:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
