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

interface CancellationEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  roomName: string
  guests: number
  originalAmount: number
  penalty: number
  refundAmount: number
  isFullRefund: boolean
}

interface BookingUpdateEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  roomName: string
  guests: number
  nights: number
  originalAmount: number
  newAmount: number
  penalty?: number
  priceDifference?: number
  modificationType: "change_dates" | "add_guests"
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
      <p>Questa è una email automatica, si prega di non rispondere.</p>
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

export async function sendCancellationEmail(data: CancellationEmailData) {
  try {
    console.log("[Email] Sending cancellation email to:", data.to)

    const siteUrl = "https://al22suite.com"

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #dc2626; }
    .refund-box { background: ${data.isFullRefund ? "#d1f4e0" : "#fee"} ; border: 2px solid ${data.isFullRefund ? "#10b981" : "#dc2626"}; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Prenotazione Cancellata</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      
      <p>La tua prenotazione è stata cancellata come richiesto.</p>
      
      <div class="booking-details">
        <h2 style="color: #dc2626; margin-top: 0;">📋 Dettagli Prenotazione Cancellata</h2>
        
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
          <span class="detail-label">Ospiti:</span>
          <span>${data.guests}</span>
        </div>
        
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Importo Originale:</span>
          <span>€${(data.originalAmount / 100).toFixed(2)}</span>
        </div>
      </div>
      
      <div class="refund-box">
        <h3 style="margin-top: 0; color: ${data.isFullRefund ? "#10b981" : "#dc2626"};">
          ${data.isFullRefund ? "✅ Rimborso Completo" : "⚠️ Penale Applicata"}
        </h3>
        
        ${
          data.isFullRefund
            ? `
          <p><strong>Importo da Rimborsare:</strong> €${(data.refundAmount / 100).toFixed(2)}</p>
          <p><strong>Penale:</strong> €0.00</p>
          <p style="margin-top: 15px; font-size: 14px;">Il rimborso verrà elaborato entro 5-10 giorni lavorativi sulla carta utilizzata per il pagamento.</p>
        `
            : `
          <p><strong>Penale (50%):</strong> €${(data.penalty / 100).toFixed(2)}</p>
          <p><strong>Importo da Pagare:</strong> €${(data.penalty / 100).toFixed(2)}</p>
          <p style="margin-top: 15px; font-size: 14px;">Hai cancellato entro 7 giorni dal check-in. Secondo la nostra politica di cancellazione, è dovuta una penale del 50% dell'importo totale.</p>
        `
        }
      </div>
      
      <p style="margin-top: 30px;">Se hai domande o necessiti di assistenza, non esitare a contattarci.</p>
      
      <p>Cordiali saluti,<br><strong>Il Team di Al 22 Suite & Spa</strong></p>
    </div>
    
    <div class="footer">
      <p>Al 22 Suite & Spa Luxury Experience</p>
      <p>Polignano a Mare, Italia</p>
      <p>Email: progettocale@gmail.com</p>
    </div>
  </div>
</body>
</html>
    `

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Al 22 Suite <noreply@al22suite.com>",
      to: data.to,
      subject: `❌ Cancellazione Prenotazione - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) {
      console.error("[Email] Error sending cancellation email:", error)
      return { success: false, error: error.message }
    }

    console.log("[Email] Cancellation email sent successfully!")
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error("[Email] Error in sendCancellationEmail:", error)
    return { success: false, error: error.message }
  }
}

export async function sendBookingUpdateEmail(data: BookingUpdateEmailData) {
  try {
    console.log("[Email] Sending booking update email to:", data.to)

    const siteUrl = "https://al22suite.com"
    const totalPaid = data.originalAmount + (data.penalty || 0) + (data.priceDifference || 0)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #2563eb; }
    .payment-breakdown { background: #eff6ff; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total-row { font-size: 18px; font-weight: bold; color: #2563eb; padding-top: 15px; margin-top: 15px; border-top: 2px solid #2563eb; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Prenotazione Modificata</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      
      <p>La tua prenotazione è stata modificata con successo.</p>
      
      <div class="booking-details">
        <h2 style="color: #2563eb; margin-top: 0;">📋 Nuovi Dettagli Prenotazione</h2>
        
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
        
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Ospiti:</span>
          <span>${data.guests}</span>
        </div>
      </div>
      
      <div class="payment-breakdown">
        <h3 style="margin-top: 0; color: #2563eb;">💰 Riepilogo Pagamenti</h3>
        
        <div class="detail-row" style="border-bottom: 1px solid #bfdbfe;">
          <span>Prenotazione Originale:</span>
          <span>€${(data.originalAmount / 100).toFixed(2)}</span>
        </div>
        
        ${
          data.penalty
            ? `
        <div class="detail-row" style="border-bottom: 1px solid #bfdbfe; color: #dc2626;">
          <span>Penale (50%):</span>
          <span>+€${(data.penalty / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        ${
          data.priceDifference && data.priceDifference > 0
            ? `
        <div class="detail-row" style="border-bottom: 1px solid #bfdbfe; color: #16a34a;">
          <span>Differenza Prezzo:</span>
          <span>+€${(data.priceDifference / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        ${
          data.priceDifference && data.priceDifference < 0
            ? `
        <div class="detail-row" style="border-bottom: 1px solid #bfdbfe; color: #16a34a;">
          <span>Storno (Rimborso):</span>
          <span>-€${Math.abs(data.priceDifference / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        <div class="detail-row total-row" style="border-bottom: none;">
          <span>TOTALE SPESO:</span>
          <span>€${(totalPaid / 100).toFixed(2)}</span>
        </div>
      </div>
      
      <p style="margin-top: 30px;">Se hai domande o necessiti di assistenza, non esitare a contattarci.</p>
      
      <p>A presto,<br><strong>Il Team di Al 22 Suite & Spa</strong></p>
    </div>
    
    <div class="footer">
      <p>Al 22 Suite & Spa Luxury Experience</p>
      <p>Polignano a Mare, Italia</p>
      <p>Email: progettocale@gmail.com</p>
    </div>
  </div>
</body>
</html>
    `

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Al 22 Suite <noreply@al22suite.com>",
      to: data.to,
      subject: `✅ Prenotazione Modificata - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) {
      console.error("[Email] Error sending update email:", error)
      return { success: false, error: error.message }
    }

    console.log("[Email] Update email sent successfully!")
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error("[Email] Error in sendBookingUpdateEmail:", error)
    return { success: false, error: error.message }
  }
}
