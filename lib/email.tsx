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
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  originalAmount: number
  refundAmount: number
  penalty: number
  isFullRefund: boolean
  manualRefund?: boolean // Added to indicate manual processing
}

interface ModificationEmailData {
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
  guestAdditionCost?: number
  dateChangeCost?: number
  modificationType: "dates" | "guests" | "both"
  refundAmount?: number // Added for refund notification
  manualRefund?: boolean // Added to indicate manual processing
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
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #1e40af; }
    .credentials-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; color: #1e40af; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
        <h2 style="color: #1e40af; margin-top: 0;">📋 Dettagli Prenotazione</h2>
        
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
        
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Importo Totale Pagato:</span>
          <span style="color: #059669; font-weight: bold; font-size: 18px;">€${(data.totalAmount / 100).toFixed(2)}</span>
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

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.error("[Email] Email service not configured")
      return { success: false, error: "Email service not configured" }
    }

    const siteUrl = "https://al22suite.com"

    const isManagementEmail = data.to.includes("@al22suite.com") || data.to === process.env.NEXT_PUBLIC_PRIVACY_EMAIL

    const subject = isManagementEmail
      ? `🔔 NOTIFICA CANCELLAZIONE - ${data.roomName} - ${data.bookingId}`
      : `❌ Prenotazione Cancellata - ${data.bookingId}`

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
    .refund-box { background: ${data.isFullRefund ? "#d1f4e0" : "#fff3cd"}; border: 2px solid ${data.isFullRefund ? "#10b981" : "#ffc107"}; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    ${isManagementEmail ? `.admin-notice { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold; }` : ""}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isManagementEmail ? "🔔 NOTIFICA CANCELLAZIONE" : "❌ Prenotazione Cancellata"}</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      ${
        isManagementEmail
          ? `
      <div class="admin-notice">
        ⚠️ ATTENZIONE DIREZIONE: Una prenotazione è stata cancellata e richiede elaborazione del rimborso da Stripe.
      </div>
      <p><strong>Cliente:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email Cliente:</strong> ${data.to}</p>
      `
          : `<p>Gentile ${data.firstName} ${data.lastName},</p>`
      }
      
      <p>${isManagementEmail ? "Dettagli della prenotazione cancellata:" : "La tua prenotazione è stata cancellata con successo."}</p>
      
      <div class="booking-details">
        <h2 style="color: #dc2626; margin-top: 0;">📋 Dettagli Prenotazione ${isManagementEmail ? "" : "Cancellata"}</h2>
        
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
          <span>€${data.originalAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="refund-box">
        <h3 style="margin-top: 0; color: ${data.isFullRefund ? "#059669" : "#856404"};">
          ${data.isFullRefund ? "✅ Rimborso Completo" : "⚠️ Penale Applicata"}
        </h3>
        
        ${
          data.isFullRefund
            ? `
          <p><strong>Importo da Rimborsare:</strong> €${data.refundAmount.toFixed(2)}</p>
          <p style="font-size: 14px; margin-top: 15px;">
            ${isManagementEmail ? "⚠️ AZIONE RICHIESTA: Elaborare il rimborso dalla dashboard Stripe entro 3 giorni lavorativi." : data.manualRefund ? "Il rimborso verrà elaborato manualmente dal nostro team entro <strong>3 giorni lavorativi</strong> sulla carta utilizzata per il pagamento." : "Il rimborso verrà elaborato entro 3 giorni lavorativi sulla carta utilizzata per il pagamento."}
          </p>
        `
            : `
          <p><strong>Penale:</strong> €${data.penalty.toFixed(2)}</p>
          <p><strong>Importo da Rimborsare:</strong> €${data.refundAmount.toFixed(2)}</p>
          <p style="font-size: 14px; margin-top: 15px; color: #856404;">
            ⚠️ La cancellazione è avvenuta a meno di 7 giorni dal check-in. È stata applicata una penale del 50%.
          </p>
          <p style="font-size: 14px; margin-top: 10px;">
            ${isManagementEmail ? "⚠️ AZIONE RICHIESTA: Elaborare il rimborso parziale dalla dashboard Stripe entro 3 giorni lavorativi." : data.manualRefund ? "Il rimborso verrà elaborato manualmente dal nostro team entro <strong>3 giorni lavorativi</strong> sulla carta utilizzata per il pagamento." : "Il rimborso verrà elaborato entro 3 giorni lavorativi sulla carta utilizzata per il pagamento."}
          </p>
        `
        }
      </div>
      
      ${
        isManagementEmail
          ? `
      <div class="admin-notice">
        <p style="margin-top: 0;"><strong>ISTRUZIONI PER ELABORARE IL RIMBORSO:</strong></p>
        <ol style="margin: 10px 0;">
          <li>Accedi alla dashboard Stripe</li>
          <li>Cerca il pagamento con ID prenotazione: ${data.bookingId}</li>
          <li>Emetti rimborso di: €${data.refundAmount.toFixed(2)}</li>
          <li>Conferma al cliente l'avvenuto rimborso</li>
        </ol>
      </div>
      `
          : `<p style="margin-top: 30px;">Se hai domande o necessiti di assistenza, non esitare a contattarci.</p>`
      }
      
      <p>${isManagementEmail ? "Email automatica di notifica cancellazione" : "Cordiali saluti,"}<br><strong>${isManagementEmail ? "Sistema Al 22 Suite" : "Il Team di Al 22 Suite & Spa"}</strong></p>
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

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Al 22 Suite <noreply@al22suite.com>",
      to: data.to,
      subject,
      html: emailHtml,
    })

    if (error) {
      console.error("[Email] Resend API error:", error)
      return { success: false, error: error.message }
    }

    console.log("[Email] Cancellation email sent successfully!")
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error("[Email] Unexpected error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function sendModificationEmail(data: ModificationEmailData) {
  try {
    console.log("[Email] Sending modification email to:", data.to)

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.error("[Email] Email service not configured")
      return { success: false, error: "Email service not configured" }
    }

    const siteUrl = "https://al22suite.com"
    const difference = data.newAmount - data.originalAmount

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #1e40af; }
    .cost-breakdown { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; color: #856404; }
    .refund-box { background: #d1f4e0; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; color: #065f46; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✏️ Prenotazione Modificata</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      
      <p>La tua prenotazione è stata modificata con successo. Ecco i nuovi dettagli:</p>
      
      <div class="booking-details">
        <h2 style="color: #1e40af; margin-top: 0;">📋 Nuovi Dettagli Prenotazione</h2>
        
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
        
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Importo Totale Pagato:</span>
          <span style="color: #059669; font-weight: bold; font-size: 18px;">€${(data.newAmount / 100).toFixed(2)}</span>
        </div>
      </div>
      
      ${
        data.refundAmount && data.manualRefund
          ? `
      <div class="refund-box">
        <h3 style="margin-top: 0; color: #059669;">✅ Rimborso in Elaborazione</h3>
        <p><strong>Importo da Rimborsare:</strong> €${(data.refundAmount / 100).toFixed(2)}</p>
        <p style="font-size: 14px; margin-top: 15px;">
          Il rimborso verrà elaborato manualmente dal nostro team entro <strong>3 giorni lavorativi</strong> sulla carta utilizzata per il pagamento originale.
        </p>
        <p style="font-size: 14px; margin: 10px 0 0 0;">
          Riceverai una notifica quando il rimborso sarà stato completato.
        </p>
      </div>
      `
          : ""
      }
      
      <div class="cost-breakdown">
        <h3 style="margin-top: 0; color: #1e40af;">💰 Riepilogo Pagamenti</h3>
        
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bae6fd;">
          <span>Prenotazione Originale:</span>
          <span>€${(data.originalAmount / 100).toFixed(2)}</span>
        </div>
        
        ${
          data.penalty
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bae6fd; color: #dc2626;">
          <span>Penale Cambio Date:</span>
          <span>+€${(data.penalty / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        ${
          data.dateChangeCost && data.dateChangeCost > 0
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bae6fd;">
          <span>Differenza Prezzo:</span>
          <span>+€${(data.dateChangeCost / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        ${
          data.refundAmount && data.manualRefund
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bae6fd; color: #059669;">
          <span>Rimborso da Ricevere:</span>
          <span>-€${(data.refundAmount / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        <div style="display: flex; justify-content: space-between; padding: 15px 0 0 0; margin-top: 10px; border-top: 2px solid #1e40af; font-size: 18px;">
          <span style="font-weight: bold;">Nuovo Importo Totale:</span>
          <span style="font-weight: bold; color: #1e40af;">€${(data.newAmount / 100).toFixed(2)}</span>
        </div>
        
        ${
          difference > 0 && !data.refundAmount
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; margin-top: 15px; border-top: 1px solid #bae6fd;">
          <span style="color: #dc2626;">Importo Pagato al Cambio Date:</span>
          <span style="color: #dc2626; font-weight: bold;">€${(difference / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #059669;">Importo Totale Pagato:</span>
          <span style="color: #059669; font-weight: bold;">€${(data.newAmount / 100).toFixed(2)}</span>
        </div>
        `
            : ""
        }
      </div>
      
      <div style="text-align: center;">
        <a href="${siteUrl}/user/booking/${data.bookingId}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Visualizza Prenotazione
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

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Al 22 Suite <noreply@al22suite.com>",
      to: data.to,
      subject: `✏️ Prenotazione Modificata - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) {
      console.error("[Email] Resend API error:", error)
      return { success: false, error: error.message }
    }

    console.log("[Email] Modification email sent successfully!")
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error("[Email] Unexpected error:", error.message)
    return { success: false, error: error.message }
  }
}
