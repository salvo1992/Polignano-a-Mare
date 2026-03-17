import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Generate random 4-digit OTP
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { newEmail, userId } = await request.json()

    if (!newEmail || !userId) {
      return NextResponse.json({ error: "Missing newEmail or userId" }, { status: 400 })
    }

    const db = getAdminDb()
    
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    
    if (!userData || !userData.email) {
      return NextResponse.json({ 
        error: "Admin email not found. Cannot send verification code." 
      }, { status: 400 })
    }

    const currentEmail = userData.email
    
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    await db.collection("admin_otp").doc("email_change").set({
      otp,
      newEmail,
      userId,
      type: "email",
      expiresAt,
      createdAt: Date.now(),
    })

    // Always send OTP to the current/old email for verification
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: currentEmail,
        subject: "Codice di Verifica - Cambio Email Admin",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Codice di Verifica</h2>
            <p>Hai richiesto di modificare l'email del tuo account amministratore.</p>
            <p><strong>Nuova email richiesta:</strong> ${newEmail}</p>
            <p>Il tuo codice di verifica è:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">Questo codice scadrà tra 10 minuti.</p>
            <p style="color: #666;">Se non hai richiesto questa modifica, ignora questa email e la tua email rimarrà invariata.</p>
          </div>
        `,
      })
      
      console.log(`[v0] Sent Email change OTP to current email ${currentEmail}: ${otp}`)
    } catch (emailError) {
      console.error("[v0] Error sending email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }
    
    const maskedEmail = currentEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length))

    return NextResponse.json({ 
      success: true, 
      message: `Codice OTP inviato alla tua email attuale (${maskedEmail})`,
    })
  } catch (error) {
    console.error("[v0] Error sending email OTP:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}


