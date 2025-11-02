// @ts-ignore: Module 'resend' may not have bundled type declarations in this project
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  roomName: string
  guests: number
  totalAmount: number
  nights: number
  newUserPassword?: string
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    console.log("[Email] Starting email send process")
    console.log("[Email] Recipient:", data.to)
    console.log("[Email] RESEND_API_KEY configured:", !!process.env.RESEND_API_KEY)
    console.log("[Email] RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL)
    console.log("[Email] Has new user password:", !!data.newUserPassword)
    if (data.newUserPassword) {
      console.log("[Email] New user password length:", data.newUserPassword.length)
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("[Email] ❌ RESEND_API_KEY not configured")
      return { success: false, error: "Email service not configured" }
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.error("[Email] ❌ RESEND_FROM_EMAIL not configured")
      return { success: false, error: "Email sender not configured" }
    }

    const isNewUser = !!data.newUserPassword
    console.log("[Email] Is new user:", isNewUser)

    const siteUrl = "https://al22suite.com"
    console.log("[Email] Using site URL:", siteUrl)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #8B4513; }
    .credentials-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info-box { background: #d1ecf1; border: 2px solid #0c5460; padding: 20px; border-radius: 8px; margin: 20px 0; color: #0c5460; }
    .button { display: inline-block; background: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Prenotazione Confermata!</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      
      <p>Grazie per aver scelto Al 22 Suite & Spa! La tua prenotazione è stata confermata con successo.</p>
      
      <div class="booking-details">
        <h2 style="color: #8B4513; margin-top: 0;">📋 Dettagli Prenotazione</h2>
        
        <div class="detail-row">
          <span class="detail-label">ID Prenotazione:</span>
          <span>${data.bookingId}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Camera:</span>
          <span>${data.roomName}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Check-in:</span>
          <span>${data.checkIn}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Check-out:</span>
          <span>${data.checkOut}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Notti:</span>
          <span>${data.nights}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Ospiti:</span>
          <span>${data.guests}</span>
        </div>
        
        <div class="detail-row" style="border-bottom: none; font-size: 18px; margin-top: 10px;">
          <span class="detail-label">Totale Pagato:</span>
          <span style="color: #8B4513; font-weight: bold;">€${(data.totalAmount / 100).toFixed(2)}</span>
        </div>
      </div>
      
      ${
        isNewUser
          ? `
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #856404;">🔐 Account Creato!</h3>
        <p>Abbiamo creato un account per te. Usa queste credenziali per accedere:</p>
        <p><strong>Email:</strong> ${data.to}</p>
        <p><strong>Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${data.newUserPassword}</code></p>
        <p style="font-size: 12px; color: #856404; margin-top: 15px;">⚠️ Ti consigliamo di cambiare la password al primo accesso.</p>
      </div>
      `
          : `
      <div class="info-box">
        <h3 style="margin-top: 0;">👤 Accedi al tuo Account</h3>
        <p>La prenotazione è stata aggiunta al tuo account esistente. Accedi con le tue credenziali per visualizzare tutti i dettagli e gestire le tue prenotazioni.</p>
        <p style="margin-bottom: 0;"><strong>Email:</strong> ${data.to}</p>
      </div>
      `
      }
      
      <div style="text-align: center;">
        <a href="${siteUrl}/user" class="button">
          ${isNewUser ? "Accedi al tuo Account" : "Visualizza le tue Prenotazioni"}
        </a>
      </div>
      
      <p style="margin-top: 30px;">Se hai domande o necessiti di assistenza, non esitare a contattarci.</p>
      
      <p>A presto,<br><strong>Il Team di Al 22 Suite & Spa</strong></p>
    </div>
    
    <div class="footer">
      <p>Al 22 Suite & Spa Luxury Experience</p>
      <p>Polignano a Mare, Italia</p>
      <p>Questa �� una email automatica, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>
    `

    console.log("[Email] Attempting to send via Resend...")
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Al 22 Suite <noreply@al22suite.com>",
      to: data.to,
      subject: `✨ Prenotazione Confermata - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) {
      console.error("[Email] ❌ Resend API error:", error)
      console.error("[Email] Error details:", JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    console.log("[Email] ✅ Email sent successfully!")
    console.log("[Email] Email ID:", emailData?.id)
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error("[Email] ❌ Unexpected error:", error.message)
    console.error("[Email] Error stack:", error.stack)
    return { success: false, error: error.message }
  }
}
